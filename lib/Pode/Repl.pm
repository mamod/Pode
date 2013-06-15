package Pode::Repl;
use strict;
use warnings;
use IO::Handle;
use Pode::EV;

STDOUT->autoflush(1);
Pode::exports('put','readline');

sub put {
    my $self = shift;
    my $args = shift;
    my $js = shift;
    my $line = $args->[0];
    STDOUT->print($line);
    return 1;
}

sub readline {
    my $self = shift;
    my $args = shift;
    my $js = shift;
    if (my $pid = fork()){
        return 1;
    } else {
        while(<STDIN>){
            $js->Set('process._repl',$_);
        }
    }
}

EV 'repl' => sub {
    my $self = shift;
    my $args = shift;
    my $ev = shift;
    $ev->fork(sub{
        #sysread(STDIN,my $buf,1024);
        #$ev->data($buf);
        while(<STDIN>){
            #print $_ . "ccccccc\n";
            $ev->data($_);
            #$js->Set('process._repl',$_);
        }
    });
    
    return 1;
};


1;

