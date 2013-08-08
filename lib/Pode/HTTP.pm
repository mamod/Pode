package Pode::HTTP;
use IO::Socket::INET;
use IO::Select;
use strict;
use Data::Dumper;
use Carp;
use constant DEBUG => 0;

Pode::exports(
    'run',
    'start',
    'loop',
    'write',
    'read',
    'end',
    'sendFile'
);

sub new {
    my($class, %args) = @_;
    my $self = bless {
        host               => $args{host} || 0,
        port               => $args{port} || 80,
        timeout            => $args{timeout} || 15,
        server_software    => $args{server_software} || $class,
        server_ready       => $args{server_ready} || sub {},
        ssl                => $args{ssl},
        ipv6               => $args{ipv6},
        ssl_key_file       => $args{ssl_key_file},
        ssl_cert_file      => $args{ssl_cert_file},
        select             => IO::Select->new()
    }, $class;
    return $self;
}

sub start {
    my ($self,$args,$js) = @_;
    my $options = $args->[0];
    $self->{socket} = IO::Socket::INET->new(
        LocalHost => $options->{host},
        LocalPort => $options->{port},
        Listen    => SOMAXCONN,
        Proto => 'tcp',
        Reuse => 1
    ) or die "Cant't create a listening socket: $@";
    
    my $fh = $self->{socket};
    $self->{socket}->blocking(0);
    $self->{select}->add($fh);
    return 1;
}

sub loop {
    my ($self,$args,$js) = @_;
    my @ready = $self->{select}->can_read(0.001);
    if (@ready){
        foreach my $fh (@ready){
            if ( $fh == $self->{socket} ){
                my $new = $fh->accept();
                $self->{select}->add($new);
            } else {
                $self->{select}->remove($fh);
                DEBUG and warn "Sending To Process [$$]\n";
                my $fd = fileno $fh;
                #binmode $fh, "utf8";
                $self->{SERVERS}->{$fd} = $fh;
                return $fd;
            }
        }
    }
    return \0;
}

sub end {
    my ($self,$args) = @_;
    my $fd = $args->[0];
    my $content = $args->[1];
    my $fh = delete $self->{SERVERS}->{$fd};
    return \0 if !$fh;
    
    if ($content){
        print $fh $content;
    }
    
    DEBUG and warn "Closing Sock No $fd\n";
    ##close socket
    $fh->shutdown(2);
    $fh->close;
    return 1;
}

sub write {
    my ($self,$args,$js) = @_;
    my $fd = $args->[0];
    my $content = $args->[1];
    my $length = $args->[2] || 0;
    my $fh = $self->{SERVERS}->{$fd};
    return \0 if !$fh;
    syswrite($fh, $content, $length);
    return 1;
}

sub read {
    my ($self,$args) = @_;
    my $content;
    my $fh = $self->{SERVERS}->{$args->[0]};
    my $bufferRead = $args->[1];
    #$fh->blocking(1);
    my $disconnect = 0;
    
    my $bytes_read = sysread($fh, my $buf, $bufferRead);
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
    
    return -1 if $disconnect;
    return $buf;
}

sub sendFile {
    my $self = shift;
    my $args = shift;
    my $fh = $self->{SERVERS}->{$args->[0]};
    my $file = $args->[1];
    
    my $data = '';
    if (open(my $fh2,'<',$file)){
        binmode $fh2;
        $data = do { local $/; <$fh2> };
        close($fh2);
    }
    
    $fh->blocking(1);
    print $fh $data;
    
    $fh->shutdown(2);
    $fh->close;
    return 1;
}


1;

__END__

