package Pode::Cluster;
use Pode::Module;
use strict;
use warnings;
use Data::Dumper;

sub ini {
    return {
        exports => ['create','test','run','change']
    }
}

sub new {
    my $options = shift;
    my $self = bless($options,__PACKAGE__);
    return $self;
}



sub create {
    my $self = shift;
    my $args = shift;
    my $ob = shift;
    
    my ($PARENT_RDR, $CHILD_WTR);
    pipe($PARENT_RDR, $CHILD_WTR); # XXX: check failure?
    $CHILD_WTR->autoflush(1);
    $PARENT_RDR->autoflush(1);
    
    my $pid = fork();
    $self->{$pid} = $CHILD_WTR;
    pode()->{CLUSTER}->{$pid} = $CHILD_WTR;
    
    if ($pid) {
        close $PARENT_RDR;
        return $pid;
    } else {
        die "cannot fork: $!" unless defined $pid;
        #close CHILD_WTR;
        while(chomp(my $line = <$PARENT_RDR>)){
            print "Child Pid $$ just read this: '$line'\n";
            pode()->{WRITER}->print("{}\n");
            pode()->processData($line);
            #die $ret;
            #print Dumper $ret;
            print "$$ sending this\n";
        }
        
        close $PARENT_RDR;
        exit(0);
    }
}


sub run {
    my $self = shift;
    my $args = shift;
    my $ob = shift;
    return 1;
}

sub ret {
    return "yyyyyyyy";
}


sub test {
    return 'hi';
}


exports 'test' => 'test';
exports 'test2' => 'test2';
register __PACKAGE__ => 'Cluster';


1;

__END__
