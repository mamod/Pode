package EV;
use Pode::EV;
use strict;
use warnings;
use Data::Dumper;
Pode::exports('size','err');


EV 'testError' => sub {
    my $self = shift;
    my $args = shift;
    my $ev = shift;
    $ev->loop( sub {
        $ev->error('Something Wrong');
        $ev->data('this can\'t be called');
    });
    return 1;
};

EV 'testError2' => sub {
    my $self = shift;
    my $args = shift;
    my $ev = shift;
    $ev->fork( sub {
        $ev->error('Something Wrong');
        $ev->data('this can\'t be called');
    });
    return 1;
};

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

EV 'readFile2' => sub {
    my $self = shift;
    my $args = shift;
    my $ev = shift;
    my $file = $args->[0];
    open my $fh,'<',$file or die $!;
    $ev->fork( sub {
        my $read = sysread($fh, my $buf, 512);
        if ($read){
            sleep 1;
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
    $self->{_file} = $fh;
    
    $ev->loop( sub {
        my $read = sysread($fh, my $buf, 64740);
        if ($read){
            $ev->data({ bytes => $read});
        } else  {
            $ev->end();
        }
    });
    
    return fileno $fh;
    
};


EV 'readBigFile2' => sub {
    
    my $self = shift;
    my $args = shift;
    my $ev = shift;
    
    my $file = $args->[0];
    open my $fh,'<',$file or die $!;
    $self->{_file} = $fh;
    
    $ev->fork( sub {
        my $read = sysread($fh, my $buf, 64740);
        if ($read){
            $ev->data({ bytes => $read});
        } else  {
            $ev->end(1199,{rr => 'fff'});
        }
    });
    
    return fileno $fh;
    
};

sub size {
    my $self = shift;
    return (stat $self->{_file})[7];
}


sub err {
    
    return Pode::throw('HHHHHHHHHH');
}

1;
