package Pode::TEST;
use Pode::EV;
use strict;
use warnings;
use IO::Handle;
use Data::Dumper;
use IO::Handle;

EV 'test3' => sub {
    my $self = shift;
    my $args = shift;
    my $ev = shift;
    
    my $file = $args->[0];
    open my $fh,'<',$file or die $!;
    
    $ev->loop( sub {
        my $read = sysread($fh, my $buf, 9064706);
        if ($read){
            $ev->data($buf);
        } else {
            $ev->end(11);
        }
    });
    
    return fileno $fh;
};


EV 'test4' => sub {
    my $self = shift;
    my $args = shift;
    my $ev = shift;
    
    my $file = $args->[0];
    open my $fh,'<',$file or die $!;
    my $c = 0;
    $ev->fork( sub {
        sleep 1;
        $ev->data({hi => 'there'});
        
        #my $read = sysread($fh, my $buf, 90647);
        #if ($read){
        #    $ev->data({ hi => $buf});
        #    #$ev->end(11);
        #} else {
            $ev->end(11);
        #}
    });
    
    return fileno $fh;
};


1;

