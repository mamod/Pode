package fs;
use Pode::EV;
use strict;
use warnings;
use IO::File;
Pode::exports('go');

EV 'readFile' => sub {
    
    my $self = shift;
    my $args = shift;
    my $ev = shift;
    
    my $file = $args->[0];
    my $mode = $args->[1];
    
    my $fh = IO::File->new($file,$mode) or return Pode::throw($! . " " . $file);
    my $bytes = (stat $fh)[7] || 512;
    #$bytes = 128 * 1024;
    #$bytes = $bytes/8;
    my $str = '';
    $self->{data} = '';
    $ev->loop(sub{
        #select(undef,undef,undef,0.01);
        my $read = sysread($fh,my $buf,$bytes);
        if ($read){
            $self->{data} .= $buf;
            #$str .= $buf;
            $ev->data($read);
        } else {
            $ev->end();
        }
    });
    
    return 1;
    
};

sub go {
    my $self = shift;
    my $args = shift;
    
    print $self->{data} . "\n";
}

1;
