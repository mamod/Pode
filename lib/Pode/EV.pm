package Pode::EV;
use strict;
use warnings;
use Carp;
use Exporter 'import';
our @EXPORT = qw(EV);
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
use Carp;

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
        croak 'Loop must be a code ref';
    }
    $self->{loop} = $loop;
    return $self;
}

sub fork {
    my $self = shift;
    my $fork = shift;
    
    if (ref $fork ne 'CODE'){
        croak 'Fork must be a code ref';
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
            $self->{pid} = $pid;
            $self->{loop} = sub {
                my $cur = (stat($fh))[7];
                if ($cur > $change){
                    seek $fh,$change,0;
                    my $data = sysread($fh,my $buf,$cur-$change);
                    my @lines = split /\n/,$buf;
                    map {
                        if ($_ =~ s/^EOF//){
                            delete $EVENTS{$pointer};
                            close $fh;
                        } elsif ($_ =~ s/^ERROR//){
                            delete $EVENTS{$pointer};
                        }
                        
                        $js->send('jshell.execFunc(' . $_ . ')');
                        
                    } @lines;
                    $change = $cur;
                }
            };
            return 1;
        } else {
            while ($self->{running}){
                $fork->();
            }
            close $fh;
            exit(0);
        }
        exit(0);
    };
    
    return $self;
}

sub _json {
    my $self = shift;
    my $fn = shift;
    my $start = shift || '';
    
    my $pointer = $self->{pointer};
    my $js = $self->{js};
    my $fh = $self->{fh};
    my $send = {
        fn => $fn,
        args => [$pointer,@_],
        context => $js->context
    };
    
    $send = $js->toJson($send);
    $fh->syswrite($start . $send . "\n");
}

sub data {
    my $self = shift;
    my $pointer = $self->{pointer};
    my $js = $self->{js};
    
    if ($self->{fork}){
        $self->_json('EV.data','',@_);
    } else {
        $js->call('EV.data',$pointer,@_);
    }
}

##TODO
sub emit {
    my $self = shift;
    my $fn = shift;
    my $pointer = $self->{pointer};
    my $js = $self->{js};
    
    if ($self->{fork}){
        $self->_json('EV.emit','',@_);
    } else {
        $js->call('EV.emit',$pointer,@_);
    }
}

sub end {
    my $self = shift;
    #my $args = shift;
    my $js = $self->{js};
    my $pointer = $self->{pointer};
    delete $EVENTS{$pointer};
    
    ##kill child processes if any
    $self->destroy;
    
    if ($self->{fork}){
        $self->{running} = 0;
        $self->_json('EV.end','EOF',@_);
    } else {
        $js->call('EV.end',$pointer,@_);
    }
}

sub error {
    my $self = shift;
    ##stop event
    delete $EVENTS{$self->{pointer}};
    my $js = $self->{js};
    my $pointer = $self->{pointer};
    
    if ($self->{fork}){
        $self->{running} = 0;
        $self->_json('EV.error','ERROR',@_);
    } else {
        $js->call('EV.error',$pointer,@_);
    }
}

sub run {
    my $self = shift;
    $self->{loop}->() if $self->{loop};
    $self->{fork}->() if $self->{fork};
}

sub destroy {
    my $self = shift;
    delete $EVENTS{$self->{pointer}};
    if (my $pid = $self->{pid}){
        delete $self->{pid};
        kill 9,$pid;
    }
}



1;

__END__

