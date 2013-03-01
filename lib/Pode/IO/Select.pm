package Pode::IO::Select;
use strict;
use warnings;

my $HANDLES = {};
my @FH;

sub new {
    
    my $package = shift;
    my $options = shift;
    
    return bless({},$package);
    
}

sub get {
    return @FH;
}

sub add {
    
    my $self = shift;
    my $handle = shift;
    
    my $fileno = fileno($handle);
    
    unless (defined $fileno && $fileno >= 0){
        die "can't watch this";
    }
    
    if ($fileno == fileno(STDOUT)){
        warn "can't watch STDOUT" and return;
    }
    
    $HANDLES->{fileno $handle} = {
        fh => $handle,
        access => (stat($handle))[7]
    };
    
    
    push @FH,$handle;
    
}


sub can_read {
    
    my $self = shift;
    my $timeout = shift;
    my @can_R;
    foreach my $fh (@FH){
        if ( (stat($fh))[7] != 0 ){
            push @can_R, $fh;
        }
    }
    
    return @can_R;
}

sub can_write {
    
    my $self = shift;
    my $handle = shift;
    
    return (stat($handle))[7] == 0;
    
}



1;
