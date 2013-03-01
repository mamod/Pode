package Pode::Server;
use IO::Socket::INET;
use strict;
use Data::Dumper;
use Pode::Module;
use Carp;
use Cake::URI;
use constant MAX_PROCESSES => 2;
use constant DEBUG => 1;
use utf8;

sub ini {
    return {
        exports => ['write','run']
    }
}

sub new {
    
    my($args) = @_;

    my $self = bless {
        host               => $args->{host} || 0,
        port               => $args->{port} || 8080,
        timeout            => $args->{timeout} || 15,
        server_software    => $args->{server_software} || __PACKAGE__,
        server_ready       => $args->{server_ready} || sub {},
        ssl                => $args->{ssl},
        ipv6               => $args->{ipv6},
        ssl_key_file       => $args->{ssl_key_file},
        ssl_cert_file      => $args->{ssl_cert_file},
        prefork            => $args->{prefork}
    }, __PACKAGE__;
    
    
    $self->{socket} = IO::Socket::INET->new(
        LocalHost => $self->{host},
        LocalPort => $self->{port},
        Listen    => SOMAXCONN,
        Proto => 'tcp',
        Reuse => 1
    ) or die "Cant't create a listening socket: $@";
    
    $self->{env} = {
        COUNTER => 0,
        SERVER_PORT => $self->{port},
        SERVER_NAME => $self->{host},
        SCRIPT_NAME => '',
        REMOTE_ADDR => $self->{socket}->peerhost,
        'psgi.version' => [ 1, 1 ],
        'http.version' => 1.0,
        #'psgi.errors'  => *STDERR,
        'psgi.url_scheme' => $self->{ssl} ? 'https' : 'http',
        #'psgix.io'        => $self->{socket},
        'run_once' => 0,
        #'cake.server' => $self
    };
    
    $self->{pode} = pode();
    
    return $self;
    
}

sub run {
    
    my ($self) = @_;
    my $args = shift;
    my $obj = shift;
    #print Dumper $obj;
    
    #$self->{socket}->blocking(1);
    my $sock = $self->{socket};
    $self->{env}->{COUNTER}++;
    my $env = $self->{env};
    $sock->blocking(1);
    while (my $res = $sock->accept()){
        select(undef,undef,undef,.001);
        $self->{res} = $res;
        my $env = $self->process($res);
        return $env;
        pode()->send($env);
    }

}

sub write {
    my $self = shift;
    my $options = shift;
    my $res = $self->{res};
    print $res "HTTP/1.1 200 OK\n\n";
    print $res $options->{body};
    $res->close();
    return {};
}

##mostly from plack
sub process {
    
    my ($self,$fh,$app,$env) = @_;
    
    my $content;
    $env = { %{ $self->{env} } };
    $fh->blocking(1);
    
    my $disconnect = 0;
    
    my $bytes_read = sysread($fh, my $buf, 1024);
    if (defined $bytes_read && $bytes_read > 0){
        $content .= $buf;
        ##on read
    } elsif (defined $bytes_read && $bytes_read == 0) {
        #on client disconnect
        DEBUG and warn "client disconnected \n";
        $disconnect = 1;       
    } elsif (!defined $bytes_read){
        #on EOF
        DEBUG and warn "EOF\n";
    }
    
    #$event->loop;
    
    #return -1 if $disconnect;
    
    
    my ($headers,$body) = split /\x0d?\x0a\x0d?\x0a/, $content, 2;
    my @headers  = split /\x0d?\x0a/,$headers;
    my $request = shift @headers;
    
    my ($method,$uri,$http) = split / /,$request;
    
    return -1 unless $http and $http =~ /^HTTP\/(\d+)\.(\d+)$/i;
    
    my ($major, $minor) = ($1, $2);
    
    $env->{SERVER_NAME}  = 'CAKE-SERVER-PREFORK';
    $env->{REQUEST_METHOD}  = $method;
    
    $env->{SERVER_PROTOCOL} = "HTTP/$major.$minor";
    
    $env->{REQUEST_URI}     = $uri;
    my($path, $query) = ( $uri =~ /^([^?]*)(?:\?(.*))?$/s );
    for ($path, $query) { s/\#.*$// if defined && length } # dumb clients sending URI fragments
    $env->{PATH_INFO}    = Cake::URI::uri_encode($path);
    $env->{QUERY_STRING} = $query || '';
    $env->{SCRIPT_NAME}  = '';
    
    my $token = qr/[^][\x00-\x1f\x7f()<>@,;:\\"\/?={} \t]+/;
    my $k;
    for my $header (@headers) {
        
        if ( $header =~ s/^($token): ?// ) {
            $k = $1;
            $k =~ s/-/_/g;
            $k = uc $k;

            if ($k !~ /^(?:CONTENT_LENGTH|CONTENT_TYPE)$/) {
                $k = "HTTP_$k";
            }
        } elsif ( $header =~ /^\s+/) {
            # multiline header
        }
        
        if (exists $env->{$k}) {
            $env->{$k} .= ", $header";
        } else {
            $env->{$k} = $header;
        }
    }
    
    if ($env->{CONTENT_LENGTH} && $env->{REQUEST_METHOD} =~ /^(?:POST|PUT)$/) {
        open my $body_fd, "<", \$body;
        #$env->{'client.input'} = $body_fd;
    }
    
    return $env;
}







1;

