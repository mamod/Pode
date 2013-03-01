package Pode::IO;
use strict;
use warnings;
use Pode::Module;
use Data::Dumper;
use IO::Handle;
 use IO::File;
my @FH;

use constant stdin => fileno(STDIN);
use constant stdout => fileno(STDOUT);


sub ini {
    return {
        exports =>['open','close']
    }
}

sub new {
    my $options = shift;
    my $self = bless({
        io => IO::Handle->new()
    },__PACKAGE__);    
    return $self;
}

sub open {
    my $self = shift;
    my $args = shift;
    my $fh = IO::File->new($args->{path},$args->{flag}) or die $!;
    $self->{Readable}->{fileno $fh} = $fh;
    return fileno $fh;
}


sub close {
    
    my $self = shift;
    my $args = shift;
    print Dumper 'ggggggggggg';
}


1;


__END__
