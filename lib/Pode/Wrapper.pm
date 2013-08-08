package Pode::Wrapper;
use strict;
use warnings;
use Carp;
use Exporter 'import';
our @EXPORT = qw(Wrap);
our $VERSION = "0.001";
use Data::Dumper;
use IO::Select;

my $SELECT = IO::Select->new();
sub Wrap {
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
            my $ev = Pode::Wrapper::Base->new($js,$pointer);
            my $ret = $code->($self,$args,$ev,$js);
            return $ret;
        }
    }
    
    Pode::exports($sub);
}

sub _GET {
    return Pode::Wrapper::Base::EVENTS();
}

sub Get {
    my $handle = shift;
    my $pointer = $handle->{wrapper};
    return Pode::Wrapper::Base::getObject($pointer);
}

#==============================================================================
# Wrapper Base
#==============================================================================
package Pode::Wrapper::Base;
use Data::Dumper;
use IO::Handle;
use Carp;
use Socket;
use POSIX ":sys_wait_h";

my %EVENTS = ();
my %OBJECTS = ();
sub EVENTS{%EVENTS}
sub getObject {
    my $pointer = shift;
    return $OBJECTS{$pointer} || $EVENTS{$pointer};
}

sub new {
    my $class = shift;
    my $js = shift;
    my $pointer = shift;
    my $self = bless({
        js => $js,
        pointer => $pointer
    },__PACKAGE__);
    
    $OBJECTS{$pointer} = $self;
    
    return $self;
}

sub loop {
    my $self = shift;
    my $loop = shift;
    if (ref $loop ne 'CODE'){
        croak 'Loop must be a code ref';
    }
    
    $EVENTS{$self->{pointer}} = delete $OBJECTS{$self->{pointer}};
    
    $self->{loop} = $loop;
    return $self;
}

sub fork {
    my $self = shift;
    my $fork = shift;
    
    if (ref $fork ne 'CODE'){
        croak 'Fork must be a code ref';
    }
    
    $EVENTS{$self->{pointer}} = delete $OBJECTS{$self->{pointer}};
    
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
        $self->_json('process.wrap.data','',@_);
    } else {
        $js->call('process.wrap.data',$pointer,@_);
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
        $self->_json('process.wrap.end','EOF',@_);
    } else {
        $js->call('process.wrap.end',$pointer,@_);
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
        $self->_json('process.wrap.error','ERROR',@_);
    } else {
        $js->call('process.wrap.error',$pointer,@_);
    }
}

sub run {
    my $self = shift;
    if ($self->{_pause}){
        return;
    }
    
    $self->{loop}->($self) if $self->{loop};
    $self->{fork}->() if $self->{fork};
}

sub pause {
    shift->{_pause} = 1;
}

sub resume {
    delete shift->{_pause};
}

sub destroy {
    my $self = shift;
    delete $EVENTS{$self->{pointer}};
    #delete $OBJECTS{$self->{pointer}};
    if (my $pid = delete $self->{pid}){
        kill -9,$pid;
    }
}

sub set {
    my $self = shift;
    my $fn = shift;
    my $code = shift;
    my $js = $self->{js};
    my $pointer = $self->{pointer};
    
    $js->Set("process.wrap._fn" ,sub {
        my $j = shift;
        my $args = shift;
        $code->($self,$args);
    });
    
    $js->call('process.wrap.set',$pointer,$fn);
    return;
}

sub exec {
    my $self = shift;
    my $pid;
    
    socketpair(my $CHILD, my $PARENT, AF_UNIX, SOCK_STREAM, PF_UNSPEC)
    || die "socketpair: $!";
    
    shutdown($CHILD,1);    # close write channel for $READER
    shutdown($PARENT,0);    # and read channel for $WRITER
    
    $CHILD->blocking(0);
    $PARENT->blocking(0);
    
    $CHILD->autoflush(1);
    $PARENT->autoflush(1);
    
    open my $olderr, '>&', \*STDERR or die($!);
    open my $oldout, '>&', \*STDOUT or die($!);
    open my $oldin, '<&', \*STDIN or die($!);
    
    open $_[2], '>',undef;
    open STDERR,'>&', $_[2];
    
    
    $_[1] = $CHILD;
    open STDIN,'<&', $PARENT;
    
    $_[0] = $CHILD;
    open STDOUT,'>&', $PARENT;
    
    ##shift 
    shift;shift;shift;
    my @spawn;
    #@spawn = ('perl','E:/p/dev_tests/spawn.pl');
    push @spawn,@_;
    
    
    $pid = system(1,@spawn);
    
    
    
    #select(undef,undef,undef,1);
    #close $PARENT;
    
    STDIN->fdopen(fileno $oldin,'<');
    STDOUT->fdopen(fileno $oldout,'>');
    STDERR->fdopen(fileno $olderr,'>');
    
    close $olderr;
    close $oldin;
    close $oldout;
    
    return $pid;
}


1;

__END__

