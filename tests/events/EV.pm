package EV;
use Pode::EV;
use strict;
use warnings;
use Data::Dumper;
Pode::exports();

EV 'readFile' => sub {
    
    my $self = shift;
    my $args = shift;
    my $ev = shift;
    
    my $file = $args->[0];
    open my $fh,'<',$file or die $!;
    binmode $fh,":utf8";
    
    $ev->loop( sub {
        my $read = sysread($fh, my $buf, 512);
        if ($read){
            $ev->data($buf);
        } else {
            $ev->end();
        }
    });
    
    return fileno $fh;
    
};


EV 'readBigFile' => sub {
    
    my $self = shift;
    my $args = shift;
    my $ev = shift;
    
    my $file = $args->[0];
    open my $fh,'<',$file or die $!;
    
    $ev->loop( sub {
        my $read = sysread($fh, my $buf, 64740);
        if ($read){
            $ev->data({ bytes => $read});
        } else  {
            #sleep 1;
            print Dumper $read;
            $ev->end();
        }
    });
    
    return fileno $fh;
    
};

1;
