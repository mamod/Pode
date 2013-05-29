package Pode::Utils;
use strict;
use warnings;

Pode::exports('isFile','isDir','fileSize');

sub isFile {
    my ($self,$args) = @_;
    return -f $args->[0] ? \1 : \0;
}

sub isDir {
    my ($self,$args) = @_;
    return -d $args->[0] ? \1 : \0;
}


sub fileSize {
    my ($self,$args) = @_;
    return -s $args->[0];
}



1;

__END__
