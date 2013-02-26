package Pode::Module;
use strict;
use warnings;
use Carp;
use Data::Dumper;
use base qw/Exporter/;

our @EXPORT = qw(exports register);

my $EXPORTS = {};
my $PACKAGES = {};



#if ($caller[0] eq 'Pode'){
#    #croak "Please use a good name for your Local Module ex:\npackage Local::Something;\n";
#}


sub exports {
    my @caller = caller;
    $PACKAGES->{$caller[1]} = $caller[0];
}


sub register {
    my @caller = caller;
    $PACKAGES->{$caller[1]} = $caller[0];
    #print Dumper $PACKAGES;
}

#===============================================================================
# Get caller package name
#===============================================================================
sub _package {$PACKAGES->{$_[0]}}
sub modules {$EXPORTS->{$_[0]}}

1;

__END__
