package Pode::IPC;
use IPC::Open3;

use Pode::Wrapper;
use strict;
use warnings;
use Data::Dumper;
use IO::Handle;
use POSIX ":sys_wait_h";
use Symbol 'gensym';
use FileHandle;
use constant BUFF => 10 * 512;

use POSIX qw(:errno_h);

my $ready = $^O eq 'MSWin32' ? \&Ready_MS : \&Ready;

Wrap 'fork' => sub {
    my $self = shift;
    my $args = shift;
    my $ev = shift;
    
    my $prog = $args->[0];
    my @args = $args->[1] ? @{$args->[1]} : ();
    
    my ($out,$in);
    use Socket;
    #socketpair($out, $in, AF_UNIX, SOCK_STREAM, PF_UNSPEC)
    #|| die "socketpair: $!";
    #
    #$in->blocking(0);
    #$out->blocking(0);
    
    my $err = gensym;
    my $pid = open3($in, $out, $err, ($prog,@args)) or return Pode::throw($!);
    print Dumper $out;
    $out->autoflush(1);
    $out->blocking(0);
    $in->autoflush(1);
    $in->blocking(0);
    
    my $exit = undef;
    $ev->{pid} = $pid;
    my @lines;
    
    $ev->set('send',sub {
        my $s = shift;
        $s->pause;
        my $message = shift->[0];
        my $read = $in->syswrite($message);
        $s->resume;
        return $read || 0;
    });
    
    my $c = 0;
    $ev->loop( sub {
        $c++;
        
        my $read1 = emitter($ev,$out,'data');
        my $read2 = emitter($ev,$err,'error');
        
        if (!defined $exit && waitpid($pid, &WNOHANG) > 0) {
            $exit = $? >> 8;
        } elsif (defined $exit && !$read1 && !$read2){
            $ev->end($exit);
        }
    });
    
    return {
        stdin => fileno $in,
        stdout => fileno $out,
        stderr => fileno $err
    };
};


sub emitter {
    my ($ev,$fh,$type) = @_;
    my $is_ready = $ready->($fh);
    my $read = 0;
    my $str = '';
    while ($is_ready = $ready->($fh)){
        $read = sysread($fh,my $buf,1024);
        $str .= $buf;
    }
    
    $ev->data({
        $type => $str
    }) if $str;
    
    return $read;
}


sub emitterx {
    my ($ev,$fh,$type) = @_;
    my $is_ready = $ready->($fh);
    my $read = 0;
    my $str = '';
    while ($is_ready = $ready->($fh)){
        $read = sysread($fh,my $buf,512);
        $str .= $buf;
        $ev->data({
        $type => $buf
    }) if $buf;
    }
    
    return $read;
}

sub emitter2 {
    my ($ev,$fh,$type) = @_;
    my $is_ready = $ready->($fh);
    my $read = 0;
    
    if ($is_ready){
        $read = sysread($fh,my $buf,512);
        $ev->data({
            $type => $buf
        }) if $buf;
    }
    
    return $read;
}

sub Ready_MS {
    my $fh = shift;
    return -s $fh;
}

sub Ready {
    my $fh = shift;
    my $fd = fileno $fh;
    my $rfd = '';
    vec ($rfd, $fd, 1) = 1;
    if (select ($rfd, undef, undef, 0) >= 0 && vec($rfd, $fd, 1)){
        return 1;
    }
    return 0;
}

1;

__END__
