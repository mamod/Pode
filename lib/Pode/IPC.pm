package Pode::IPC;
use IPC::Open3;
use Pode::EV;
use strict;
use warnings;
use Data::Dumper;
use IO::Handle;
use POSIX ":sys_wait_h";

EV 'fork' => sub {
    
    my $self = shift;
    my $args = shift;
    
    my $prog = $args->[0];
    my @args = @{$args->[1]};
    
    my $ev = shift;
    my ($from,$to);
    
    use Symbol 'gensym'; my $err = gensym;
    my $pid = open3($to, $from, $err, ($prog,@args)) or return Pode::throw($!);
    $ev->{pid} = $pid;
    $ev->loop(sub{
        if (waitpid($pid, &WNOHANG) > 0) {
            ##make sure that we consumed all messages
            ##before emitting exit
            while(emitter($ev,$from,'data') || emitter($ev,$err,'error') ){}
            
            my $exit_status = $? >> 8;
            $ev->end($exit_status);
        }
        
        emitter($ev,$from,'data');
        emitter($ev,$err,'error');
        
    });
    
    return 1;
};

sub emitter {
    my ($ev,$fh,$type) = @_;
    seek $fh,0,0;
    my $len = -s $fh;
    read($fh,my $buf,$len);
    if ($buf){
        $ev->data({
        $type => $buf
        });
    }
    return $len;
}


1;

__END__
