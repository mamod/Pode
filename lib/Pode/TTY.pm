package Pode::TTY;
use strict;
use warnings;
use IO::Handle;

Pode::exports('guessHandleType','isTTY','getWindowSize');

sub guessHandleType {
    my $self = shift;
    my $args = shift;
    
    my $io = IO::Handle->new();
    my $fh = $io->fdopen($args->[0], 'w') or Pode::throe($!);
    
    my $type = '';
    if (-t $fh){
        $type = 'TTY';
    } elsif (-p $fh){
        $type = 'PIPE';
    } elsif (-f $fh){
        $type = 'FILE';
    } else {
        $type = 'UNKNOWN';
    }
    
    return $type;
}

sub isTTY {
    my $self = shift;
    my $args = shift;
    
    if ($self->guessHandleType($args) eq 'TTY'){
        ##return true
        return \1;
    }
    
    return \0;
}

sub getWindowSize {
    my $js = shift;
    my $args = shift;
    
    return [80,25];
}


1
__END__
