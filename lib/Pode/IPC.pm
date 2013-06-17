package Pode::IPC;
use IPC::Open3;
use Pode::EV;
use strict;
use warnings;
use Data::Dumper;
use IO::Handle;
use POSIX ":sys_wait_h";
use Symbol 'gensym';

my $ready = $^O eq 'MSWin32' ? \&Ready_MS : \&Ready;

EV 'fork' => sub {
    
    my $self = shift;
    my $args = shift;
    
    my $prog = $args->[0];
    my @args = @{$args->[1]};
    
    my $ev = shift;
    my ($from,$to);
    
    my $err = gensym;
    my $pid = open3($to, $from, $err, ($prog,@args)) or return Pode::throw($!);
    
    $from->blocking(0);
    $from->autoflush(1);
    
    my $exit = undef;
    $ev->{pid} = $pid;
    $ev->loop( sub {
        
        my $read1 = emitter($ev,$from,'data');
        my $read2 = emitter($ev,$err,'error');
        
        if (!defined $exit && waitpid($pid, &WNOHANG) > 0) {
            $exit = $? >> 8;
        } elsif (defined $exit && !$read1 && !$read2){
            $ev->end($exit);
        }
    });
    
    return 1;
};

sub emitter {
    my ($ev,$fh,$type) = @_;
    my $is_ready = $ready->($fh);
    my $read = 0;
    if ($is_ready){
        $read = sysread($fh,my $buf,2048);
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
