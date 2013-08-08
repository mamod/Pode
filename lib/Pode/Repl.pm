package Pode::Repl;
use strict;
use warnings;
use IO::Handle;
use Pode::Wrapper;

#STDOUT->autoflush(1);
Pode::exports();

Wrap 'readline' => sub {
    my $self = shift;
    my $args = shift;
    my $ev = shift;
    my $i = 0;
    
    $ev->fork( sub {
        while(<STDIN>){
            $ev->data($_);
        }
        
        $ev->end();
        $ev->destroy();
        
    });
    
    return 1;
};


1;

