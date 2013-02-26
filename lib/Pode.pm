package Pode;
use strict;
use warnings;
use utf8;
use FindBin qw($Bin);
use File::Spec;
use Carp;
use JSON::Any;
use Pode::Utils;
use Data::Dumper;
use IO::Handle;
use Pode::Module;
use constant 'WORKERS' => 4;
my @PROCESSES = ();
use POSIX qw(:signal_h :errno_h :sys_wait_h);
use Socket;

$SIG{PIPE} = sub { die "whoops, pipe broke" };

my $CACHEDOBJ;

#BEGIN {
#   $SIG{INT} = \&trapper;
#}
#my $TEST;
#
#
#sub trapper {
#    print @_,"vvvvvvv\n";
#    select(undef,undef,undef,.02);
#    $TEST = 88;
#    for (@PROCESSES){
#        kill 'INT',$_;
#    }
#    exit(0);
#    # $$ is the pid of the current process
#}
#===============================================================================
# Global Methods
#===============================================================================
my $tickcounter = 0;
my $METHODS = {
    pid => sub {
        return $$;
    },
    os => sub { return {
        pid => $$,
        env => \%ENV,
        os => $^O
    }},
    emit => \&emit,
    fork => \&forker,
    tock => \&tock,
    tick => \&tick,
    exec => \&_exec,
    prefork => \&prefork,
    sleep => \&_sleep,
    load => \&_loadModule,
    destroy => \&_destroy,
    Modules => {},
    test => \&test,
    resume => \&resume,
    pause => \&pause,
    io => \&io,
    getObject => \&getObject
};


sub new {
    my $class = shift;
    ( my $path = $INC{'Pode.pm'} ) =~ s/\.pm$//;
    #$path = File::Spec->canonpath($path);
    #open my $stdout, '>&', \*STDOUT;
    
    return bless({
        #stdout => $stdout,
        _path => $path,
        _json => JSON::Any->new,
        _select => Pode::IO::Select->new,
        pid => $$
    },$class);
}



#===============================================================================
# helpers
#===============================================================================
sub path        {   shift->{_path}                  }
sub json        {   shift->{_json}                  }
sub toJson      {   shift->{_json}->objToJson(@_)   }
sub toObject    {   shift->{_json}->jsonToObj(@_)   }
sub context     {   shift->{context}                }
sub watcher     {   shift->{Watcher}                }
sub NULL {'Pode::NULL'}

sub _sleep {
    my $self = shift;
    my $args = shift;
    my $obj = shift;
    #print "$$ Sleeps for $args\n";
    select(undef,undef,undef,$args);
    return $$;
}

sub tick {
    my $self = shift;
    my $args = shift;
    my $obj = shift;
    select(undef,undef,undef,$args);
    return 'pode_tick';
}

#===============================================================================
# TODO : error handling, zombies reaper... I'm not familiar with piping
#===============================================================================
sub run {
    
    my $self = shift;
    my $file = shift;
    my ($basePath) = $file =~ /(.*)\/+?/ if $file;
    $self->{basePATH} = $basePath;
    
    my $cmd = 'E:/spidermonkey/js.exe -i -e ' . $self->_ini_script($file);
    
    #my ($FROM_PERL,$TO_JSHELL,$FROM_JSHELL,$TO_PERL);
    pipe($self->{FROM_PERL}, $self->{TO_JSHELL})     or die "pipe: $!";
    pipe($self->{FROM_JSHELL},  $self->{TO_PERL})    or die "pipe: $!";
    
    
    
    $self->{TO_JSHELL}->autoflush(1);   # autoflush
    $self->{FROM_JSHELL}->autoflush(0);
    $self->{TO_PERL}->autoflush(1);   # autoflush
    $self->{FROM_PERL}->autoflush(1);
    
    open my $oldin,  '<&', \*STDIN  or return ();
    open my $oldout, '>&', \*STDOUT or return ();
    $oldin->autoflush(1);
    $oldout->autoflush(1);
    STDOUT->autoflush(1);
    STDIN->autoflush(1);
    
    open( STDIN, '<&', $self->{FROM_PERL} ) or die "Can't forward stdin $!";
    open( STDOUT, '>&', $self->{TO_PERL} ) or die "Can't forward stdout $!";
    
    
    
    push @PROCESSES,$$;
    my $WATCHER = $self->{FROM_JSHELL};
    
    local $SIG{CHLD} = 'IGNORE';
    
    if (my $pid = fork) {
        close $self->{FROM_PERL}; close $self->{TO_PERL};
        
        close STDIN;
        open STDIN, '<&', $oldin;
        
        close STDOUT;
        open STDOUT, '>&', $oldout;
        
        local $/ = "\n";
        local $_; #localize -- fixing issue = $_ floating around
        my $obj;
        my $catch;
        
        while(my $catch = <$WATCHER>){
            $catch =~ s/^.*js> //;
            if ($catch =~ s/to_perl\[(.*)\]end_perl/$1/){
                #print "got $catch";
                my $str = $self->processData($catch);
                #print $str;
                $self->{TO_JSHELL}->write("process.evalObj($str);\n");
            } else {
                #$self->{TO_JSHELL}->syswrite("process.stdin.emit('data','uuu')\n");
                STDOUT->print($catch);
            }
        }
        
        print "EXIT $$\n";
        
        close $self->{FROM_JSHELL}; close $self->{TO_JSHELL};
        waitpid(-1,WNOHANG);
        
    } else {
        die "cannot fork: $!" unless defined $pid;
        push @PROCESSES,$$;
        close $self->{FROM_JSHELL}; close $self->{TO_JSHELL};
        exec($cmd) || die "can't exec shell: $!";
        close $self->{FROM_PERL}; close $self->{TO_PERL};
        exit;
    }
}


sub resume {
    my $self = shift;
    my $args = shift;
    my $obj = shift;
    
    #$self->{TO_JSHELL}->print('process.evalObj({"id" : ' . $obj->{id} . ', "sync" : true });'."\n");
    
    if (my $pid = fork()){
        return 1;
    } else {
        my $fh = IO::Handle->new();
        $fh->fdopen(9, "r");
        while(1){
            sysread($fh,my $data,3);
            #my $data = <$fh>;
            if (!$data){
                next;
            }
            $data =~ s/[\r\n]$//g;
            $self->{TO_JSHELL}->print("process.test('data','$data');\n");
        }
        
        exit();
    }
}


sub io {
    my $self = shift;
    my $args = shift;
    my $obj = shift;
    
    open(DATA, '<', "filexxxxxxx.txt");# or die $!;
    #open(DATA, '<', undef);# or die $!;
    #DATA->autoflush(1);
    return fileno(DATA);
    
}

sub io2 {
    my $self = shift;
    my $args = shift;
    my $obj = shift;
    #print Dumper fileno(STDIN);
    open my $oldin,  '<&=', \*STDIN  or return ();
    print Dumper fileno($oldin);
    return fileno($oldin);
    #open(DATA, '<', "filexxxxxxx.txt");# or die $!;
    open(DATA, '<', undef);# or die $!;
    #DATA->autoflush(1);
    return fileno(DATA);
    
}

sub getObject {
    
    my $self = shift;
    
    my $st = $self->{TO_JSHELL}->print("process.getObject('');\n");
    print Dumper $st;
    
}


sub tock {
    my $self = shift;
    if (my $pid = fork()){
        return 1;
    } else {
        my $fh = $self->{TO_JSHELL};
        while(1){
            select(undef,undef,undef,.01);
            $self->{TO_JSHELL}->print("process._tock();\n");
        }
        
        exit();
    }
}

sub pause {
    my $self = shift;
    close $self->{tt};
    return 1;
}

sub test {
    my $self = shift;
        #$self->{WATCHER} = \*STDIN;
        sleep 1;
        return 'hi';
}


#===============================================================================
#  Process data from & to js shell
#===============================================================================
sub processData {
    my $self = shift;
    my $obj = shift;
    
    #convert recieved data from json to perl hash
    #then translate and process
    my $hash = ref $obj eq 'HASH' ? $obj : $self->toObject($obj);
    
    my $ret;
    my $callMethod;
    
    if (my $pid = delete $hash->{cluster}){
        $obj = $self->toJson($hash);
        $self->{CLUSTER}->{$pid}->print($obj."\n") or die $!;
    } else {
    
    if (my $method = $hash->{method}){
        
        my $methods = $METHODS;
        if (my $class = $hash->{class}){
            unless ($methods = $methods->{$class}){
                die "you didn't load $class";
            }
        }
        
        if (my $sub = $methods->{$method}){
            $callMethod = sub { $self->$sub(shift,shift) };
        } elsif (my $new = $methods->{new}){
            $callMethod = sub { $new->$method(shift,shift) };
        }else {
            die "can't locate base method $method";
        }
        
        $ret = $callMethod->($hash->{args},$hash);
        if ($ret || ($ret && $ret == 0)) {
            if (!ref $ret){
                
                my $args = $ret;
                $ret = $hash;
                $ret->{pid} = $$;
                $ret->{args} = $args;
            } elsif (ref $ret eq 'HASH'){
                
                if ($ret->{args}){
                    $ret->{id} = $hash->{id};
                    $ret->{pid} = $$;
                } else {
                    $ret = {
                        args => $ret,
                        id => $hash->{id},
                        sync => $hash->{sync},
                        pid => $$
                    }
                }
            } elsif (ref $ret eq 'ARRAY'){
                $ret = {
                        args => $ret,
                        id => $hash->{id},
                        sync => $hash->{sync},
                        pid => $$
                    }
            }
            
        } else {
            $ret = $hash;
            $ret->{args} = undef;
        }
    }
    
    my $string = $self->toJson($ret);
    return $string;
    
    }
}

#===============================================================================
# Sending to JS shell
#===============================================================================
sub send {
    my $self = shift;
    my $ret = shift;
    if (ref $ret eq 'HASH'){
        $ret->{pid} = $$;
        $ret = $self->json->objToJson($ret);
    }
    
    $self->{WRITER}->print($ret."\n");
}

sub end {
    my $self = shift;
    my $obj = shift;
    
    if ($self->{event}){
        $self->{WRITER}->write($obj."[PODE_QUEUE]");
    } else {
        $self->{WRITER}->write($obj."\n");
    }
}


sub queue {
    my $self = shift;
    my $data = shift;
    my $obj = shift;
    
    if ($obj && ref $obj eq 'HASH'){
        $obj->{args} = $data;
        $data = $self->json->objToJson($obj);
    }
    
    $self->{WRITER}->write($data."[PODE_QUEUE]");
}


sub prefork {
    my $self = shift;
    my $args = shift;
    my $obj = shift;
    #print "forked from $$ \n";
    
    if (my $pid = fork()){
        
    } else {
        return $$;
    }
    select(undef,undef,undef,$args/10);
    return 1;
}






#===============================================================================
# TODO : error handling, I'm not familiar with piping
#===============================================================================
sub DESTROY {
    my $self = shift;
    #print Dumper \@PROCESSES;
    #my $parent;
    #for (@PROCESSES){
    #    kill -9,$_;
    #}
    ###wait();
    #for my $p (@PROCESSES){
    #    if ($p > 0){
    #        $parent = $p;
    #    } else {
    #        my $kid = waitpid(0, $p);
    #        if ($kid < 0){
    #            kill 9,$p;
    #        }
    #    }
    #    
    #    #kill 9,$_;
    #}
    #
    #kill -9,$parent if $parent;
    
}

sub _destroy {
    my $self = shift;
    my $args = shift;
    
    $self->send(-1);
    
    if ($args > 0){
        #for (@PROCESSES){
        #    kill -9,$_;
        #}
    } else {
        kill -9,$args;
    }
    
    return $$;
    
}










#===============================================================================
# loading modules
#===============================================================================
sub _loadModule {
    my $self = shift;
    my $args = shift;
    my $obj = shift;
    my $module = $args->{class};
    
    my $package;
    local $@;
    if ($module =~ m/^((.:)?[\/|\/\/|\\|\\\\])/){
        #$module = File::Spec->canonpath($module);
        eval "require '$module';";
        $package = Pode::Module::_package($module);
        
        if (!$package){
            croak "Please use Pode::Module To Register $module as Pode Module";
        }
        
    } else {
        $module =~ s/\//::/g;
        $module = __PACKAGE__.'::'.$module;
        $package = $module;
        eval "use $module";
    }
    
    my $ret;
    
    if ($@){
        die $@;
    } else {
        {
            no strict 'refs';
            if ($METHODS->{$package}){
                $ret = {
                    class => $package,
                    uri => $METHODS->{$package}->{_uri}
                };
            } else {
                my $pode = $package.'::pode';
                *$pode = sub {
                    return $self;
                };
                
                if ($package->can('ini')){
                    my $iniMethod = $package.'::ini'; 
                    $ret = &$iniMethod($args->{options});
                }
                
                if ($package->can('new')){
                    my $newMethod = $package.'::new';
                    my $blessed = &$newMethod($args->{options} || {});
                    $METHODS->{$package}->{new} = $blessed;
                }
                
                $METHODS->{$package}->{_uri} = $module;
                $ret->{class} ||= $package;
            }
        }
    }
    
    return $ret;
}

#===============================================================================
# script to start the shell, loading some required system js files
#===============================================================================
sub _ini_script {
    my $self = shift;
    my $file = shift;
    my $path = $self->{_path} || '';
    my $basePATH = $self->{basePATH} || '';
    
    $file ||= "$path/Core/repl.js";
    
    my @script = (
        '"',
        "var _podePATH = '$path'",
        "var _appPATH = '$basePATH'",
        "var _scriptToRun = '$file'",
        "load('$path/Core/require.js','$path/Core/pode.js','$file')",
        #"process.runner()",
        "process._ticks()",
        "process.exit()",
        '"'
    );
    my $javascript = join ";",@script;
    return $javascript;
}


1;

__END__

=head1 NAME

Pode

=head1 DESCRIPTION


