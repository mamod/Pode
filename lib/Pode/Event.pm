package Pode::Event;
use strict;
use warnings;


sub ini {
    
}

sub new {
    my $class = shift;
    my $pode = shift;
    
    return bless({
        pode => $pode #pode instance
    },$class);
    
}


sub run {
    my $slef = shift;
    
    
    
    
}




1;

__END__
