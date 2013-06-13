package Pode::EV;
use strict;
use warnings;
use Carp;
use Exporter 'import';
our @EXPORT = qw(EV FORK);
our $VERSION = "0.001";
use Data::Dumper;

sub EV {
    my $sub = shift;
    my $code = shift;
    my $package = caller;
    
    if ($package->can($sub)){
        croak  $sub . ' already defined in ' . $package;
    }
    
    {
        no strict 'refs';
        *{$package . '::' . $sub} = sub {
            my $self = shift;
            my $args = shift;
            my $js = shift;
            my $pointer = shift @{$args};
            my $ev = Pode::EV::Base->new($js,$pointer);
            my $ret = $code->($self,$args,$ev,$js);
            return $ret;
        }
    }
    
    Pode::exports($sub);
}

sub _GET {
    return Pode::EV::Base::EVENTS();
}

#==============================================================================
#
#==============================================================================
package Pode::EV::Base;
use Data::Dumper;
use IO::Handle;

my %EVENTS = ();
sub EVENTS{%EVENTS}
sub new {
    my $class = shift;
    my $js = shift;
    my $pointer = shift;
    my $self = bless({
        js => $js,
        pointer => $pointer
    },__PACKAGE__);
    
    $EVENTS{$pointer} = $self;
    return $self;
}

sub loop {
    my $self = shift;
    my $loop = shift;
    
    if (ref $loop ne 'CODE'){
        die 'Loop must be a code ref';
    }
    
    $self->{loop} = $loop;
    return $self;
}

sub fork {
    my $self = shift;
    my $fork = shift;
    
    if (ref $fork ne 'CODE'){
        die 'Fork must be a code ref';
    }
    
    my $js = $self->{js};
    my $pointer = $self->{pointer};
    $self->{running} = 1;
    open my $fh, '>>', undef;
    $fh->autoflush(1);
    $self->{fh} = $fh;
    my $change = (stat($fh))[7];
    $self->{fork} = sub {
        if (my $pid = fork){
            delete $self->{fork};
            $self->{loop} = sub {
                my $cur = (stat($fh))[7];
                if ($cur > $change){
                    seek $fh,$change,0;
                    my $data = read($fh,my $buf,$cur-$change);
                    my @lines = split /\n/,$buf;
                    for (@lines){
                        if ($_ eq 'EOF'){
                            $self->end();
                            undef $self;
                        } else {
                            $js->send('jshell.execFunc(' . $_ . ')');
                        }
                    }
                    $change = $cur;
                }
            };
            return 1;
        } else {
            while ($self->{running}){
                $fork->();
            }
            $fh->syswrite('EOF');
        }
        exit(0);
    };
    
    return $self;
}

sub data {
    my $self = shift;
    my $data = shift;
    my $pointer = $self->{pointer};
    my $js = $self->{js};
    
    if ($self->{fork}){
        my $fh = $self->{fh};
        my $send = {
            fn => 'EV.data',
            args => [$pointer,$data],
            context => $js->context
        };
        
        $send = $js->toJson($send);
        $fh->syswrite($send . "\n");
    } else {
        $js->call('EV.data',$pointer,$data);
    }
}

sub end {
    my $self = shift;
    my $args = shift;
    my $js = $self->{js};
    my $pointer = $self->{pointer};
    delete $EVENTS{$pointer};
    
    if ($self->{fork}){
        $self->{running} = 0;
    } else {
        $js->call('EV.end',$pointer,$args);
    }
}

sub error {
    my $self = shift;
    my $args = shift;
    delete $EVENTS{$self->{pointer}};
    my $js = $self->{js};
    my $pointer = $self->{pointer};
    $js->call('EV.error',$pointer,$args);
}

sub run {
    my $self = shift;
    $self->{loop}->() if $self->{loop};
    $self->{fork}->() if $self->{fork};
}

1;

__END__

