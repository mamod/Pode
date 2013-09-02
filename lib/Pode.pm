package Pode;
use strict;
use warnings;
use JavaScript::Shell;
use Data::Dumper;
use File::Spec;
use Cwd;
use FindBin qw($Bin);
#use Win32::Console::ANSI;
use Pode::Wrapper;
my $MODELS = {};

our $VERSION = '0.03';

sub new {
    my $class = shift;
    ( my $path = $INC{'Pode.pm'} ) =~ s/\.pm$//;
    my $self = {
        js => JavaScript::Shell->new(),
        path => $path,
        pid => $$
    };
    return bless($self,$class);
}

sub run {
    my $self = shift;
    my $argv = shift || \@ARGV;
    my $js = $self->{js};
    
    local $SIG{INT} = sub {
        $js->eval(qq!
            var t = process.emit('signal','INT');
            if (t \!== true){
                quit();
            }
        !);
        exit(0);
    };
    
    my $script = File::Spec->canonpath( $self->{path} . '/NativeModules/pode.js');
    my ($nativeDir,$sep) = $script =~ m/(.*?NativeModules)(.*?)pode.js/;
    
    ##more platforms
    my $platform = $^O eq 'MSWin32' ? 'win32' : 'linux';
    
    $ENV{STDIN} = fileno STDIN;
    $ENV{STDOUT} = fileno STDOUT;
    
    $js->Set(process_symbol => 'process');
    $js->Set('process' => {});
    $js->Set('process.pid' => $$);
    $js->Set('process.argv' => $argv);
    $js->Set('process.env' => \%ENV);
    $js->Set('process.execPath' => File::Spec->canonpath ( $Bin . '/pode'));
    $js->Set('process.moduleLoadList' => []);
    $js->Set('process._binding' => \&binding);
    $js->Set('process.getPid' => sub {return $$} );
    $js->Set('process.cwd' => sub { return cwd() } );
    $js->Set('process.sleep' => \&_sleep);
    $js->Set('process.platform' => $platform);
    $js->Set('process._tickInfoBox' => [0,0,0]);
    $js->Set('process._needTickCallback' => \&NeedTickCallback);
    $js->Set('process._nativedir' => $nativeDir . $sep);
    $js->Set('process.die' => \&error);
    $js->Set('process.exit' => \&_exit);
    $js->Set('process.check' => \&check);
    $js->Set('process._error' => sub {$!});
    
    ##this method will be called when we run a script as a
    ##daemon process, it will save process pid and service name
    my $servicecount = 0;
    $js->Set('process.savepid' => sub {
        #my $self = shift;
        my $js = shift;
        my $args = shift;
        my $filename = $args->[0];
        my $service = $args->[1];
        $service = 'service' . $servicecount++ if $service eq 'default';
        my $jspid = $js->{jshell_pid};
        
        ##get services tmp
        my $file = File::Spec->canonpath( $self->{path} . '/bin/services.tmp');
        
        open my $fh,'>>', $file;
        print $fh "$service#$filename#$jspid\n";
        close $fh;
        return 1;
        
    });
    
    $js->onError(sub{
        my $cx = shift;
        my $err = shift;
        Pode::error($cx,[$err]);
    });
    
    $js->call('load' => $nativeDir . $sep . 'pode.js');
    
    eval {
        $js->run();
    };
    
    if ($@){
        print STDERR "$@\n";
        $js->call('process.die' => $@);
        exit(1);
    }
    
    return $self;
}


sub NeedTickCallback {}
#==============================================================================
# error handler
#==============================================================================
sub error {
    my $js = shift;
    print Dumper \@_;
    $js->call('quit',1);
    exit(1);
}

sub _exit {
    my $js = shift;
    my $exitCode = shift->[0] || 0;
    $js->call('quit',$exitCode);
    $js->destroy();
    exit($exitCode);
}

#==============================================================================
# Bindings Load
#==============================================================================
my $LOAD = {};
sub exports {
    my $module = caller(0);
    if ($LOAD->{module}){
        push @{$LOAD->{exports}},@_;
    } else {
        $LOAD->{module} = $module;
        $LOAD->{exports} = \@_;
    }
}

sub binding {
    my $j = shift;
    my $args = shift;
    my $name = $args->[0];
    my $isRequire = $args->[1];
    my $module;
    my $class;
    
    ##reset LOADED Module
    $LOAD = {};
    if ($isRequire){
        my @path = File::Spec->splitdir( $name );
        $module = 'Pode';
        my $base;
        require "$name";
        die "$name doesn't export any function" if !$LOAD->{module};
        $base = $LOAD->{module};
        
        for (@path){
            $_ =~ s/://;
            $_ =~ s/\.pm//;
            $module .= '::' . $_;
        }
        
        ##normalize module name
        $module =~ s/-/_/g;
        $module =~ s/\W+//g;
        my $pkg = qq!
            package $module;
            use base '$base';
        !;
        
        eval "$pkg";
        
    } else {
        $module = "Pode::$name";
        eval "use $module;";
    }
    
    if ($@){
        die $@;
    }
    
    if ($module->can('new')){
        $class = $module->new($j);
    } else {
        $class = bless({},$module);
    }
    
    my $exports = $LOAD;
    
    #save loaded model
    $MODELS->{$module} = $class;
    return \0 if !$exports;
    $j->Set('process.bindingSend' => sub {
        my $j = shift;
        my $args = shift;
        my $method = $args->[0];
        my $arguments = $args->[1];
        return $class->$method($arguments,$j);
    });
    
    return $exports;
}

#==============================================================================
# sleep
#==============================================================================
sub _sleep {
    my $j = shift;
    my $args = shift;
    my $t = $args->[0];
    $t = $t/1000;
    select(undef,undef,undef,$t);
    return 1;
}


#sleep counter
#making things faster for event loop
#we will sleep on a counter interval
#so every 100 event loop we sleep once
my $SLEEP = 0;
sub check {
    my $js = shift;
    my %ev = Pode::Wrapper::_GET();
    if (!%ev){
        select(undef,undef,undef,0.001);
    } else {
        $SLEEP++;
        map {
            my $e = $ev{$_};
            $e->run();
        } keys %ev;
        if ($SLEEP > 10){
            select(undef,undef,undef,0.001);
            $SLEEP = 0;
        } else {
            select(undef,undef,undef,0.001);
        }
    }
    return 1;
}

sub throw {
    my $msg = shift;
    my @c = caller;
    return {
        name => 'Error',
        message => $msg,
        fileName => $c[1],
        lineNumber => $c[2]
    };
}

sub DESTROY {
    my $self = shift;
    #we need to kill all wrappers
    if ($self->{pid} == $$){
        my %ev = Pode::Wrapper::_GET();
        map {
            my $e = $ev{$_};
            $e->destroy();
        } keys %ev;
    } else {
        kill -9,$$;
    }
}

###############################################################################
#==============================================================================
# Daemon Service
#==============================================================================
sub _start {
    my $args = shift;
    my @args = @{$args};
    
    ##remove -start
    shift @args;
    my $file = shift @args;
    
    my $service = 'default';
    if ($file =~ s/^-//){
        $service = $file;
        $file = shift @args;
    }
    
    push @args, '-daemon';
    push @args, $service;
    print Dumper \@args;
    my $options = _getOptions();
    print Dumper $options;
    
    my @cmd = (
        $options->{nohup},
        $options->{wperl} || 'perl',
        File::Spec->canonpath($options->{path} . "/bin/daemon.pl"),
        'pode',
        $file,
        @args,
        #'1>E:/ls.txt 2>&1 &'
    );
    
    system(@cmd);
    exit(0);
}

sub _restart {
    my $args = shift;
    kill -9,$args->[1];
    print "Killed\n";
    exit(0);
}


sub _stop {
    my $args = shift;
    
    my $options = _getOptions();
    open my $fh,'<',$options->{pidfile};
    
    my @newLines;
    
    my $val = $args->[1];
    if (!$val){
        print "No enough arguments\n"
        . "either specify a service name or pid number\n"
        . "to check running services run 'pode -services'\n";
        exit;
    } else {
        $val =~ s/^-//;
    }
    
    my $isNumber = $val =~ m/\d+/ ? 1 : 0;
    
    while (<$fh>){
        my $line = $_;
        my @fields = split /#/,$line;
        my $service = $fields[0];
        my $file = $fields[1];
        my $pid = $fields[2];
        
        if (!$isNumber && $val eq 'all'){
            kill -9, $pid;
            print "killed $service $pid\n";
        } else {
            if ($isNumber){
                if ($val == $pid){
                    kill -9, $pid;
                    print "killed $service $pid\n";
                } else {
                    push @newLines,$line;
                }
            } else {
                if ($val eq $service || $val eq $file){
                    kill -9, $pid;
                    print "killed $service $pid\n";
                } else {
                    push @newLines,$line;
                }
            }
        }
    }
    close $fh;
    
    open my $fh2,'>',$options->{pidfile};
    my $lines = join '',@newLines;
    print $fh2 $lines;
    close $fh2;
    
    exit;
}

##list running services
sub _services {
    my $options = _getOptions();
    open my $fh,'<',$options->{pidfile};
    while (<$fh>){
        my $line = $_;
        my @fields = split /#/,$line;
        my $service = $fields[0];
        my $file = $fields[1];
        my $pid = $fields[2];
        my $exists = kill 0, $pid;
        if ( $exists ) {
            print "$service  |  $file  |  $pid\n";
        }
    }
    close $fh;
    exit(0);
}

sub _getOptions {
    
    my $options = {};
    ( my $path = $INC{'Pode.pm'} ) =~ s/\.pm$//;
    
    $options->{path} = $path;
    
    if ( $^O eq 'MSWin32' ) {
        $options->{isWindows} = 1;
        ( my $wperl = $^X ) =~ s/perl\.exe$/wperl.exe/i;
        if ( ! -x $wperl ) {
            die "no wperl.exe found";
        }
        
        $options->{wperl} = $wperl;
        $options->{nohup} = File::Spec->canonpath( $path . '/bin/nohup.exe');
    } else {
        use IPC::Cmd 'can_run';
        $options->{nohup} = can_run('nohup') or die 'nohup is not installed!';
    }
    
    $options->{pidfile} = File::Spec->canonpath($path . "/bin/services.tmp");
    
    return $options;
}


1

__END__

=head1 NAME

Pode - javascript server side for the perl community

=head1 DESCRIPTION

Pode is a way to run server side javascripts using perl and spidermonkey
shell

As a perl developer you will be interested in writing bindings, since main
functions and starter scripts will be implemented in javascript directly

=head1 SYNOPSIS

    #run pode REPL
    #execute pode from command-line without arguments
    $ pode

    #run javascript file
    $ pode /path/to/js/file.js

=head1 Perl Bindings

Writing perl bindings are the same as writing perl modules with some twists

=over 4

=item * You have to register functions you want to use from javascript

=item * Each function must return a value

Returned values must be simple strings, hash refs or array refs
simple means no code refs, or blessed objects.

=back

Example

    package Pode::Test;
    use strict;
    use warnings;
    
    sub sayHello {
        my $self = shift;
        my $args = shift;
        return $args->[0] . ' ' . $args->[1];
    }
    
    ##export function to javascript
    Pode::exports('sayHello');
    
    ##in javascript .. test.js
    var binding = process.binding('Test');
    var message = binding.sayHello('Hello','There');
    console.log(message); //Hello There
    
    ##now Run this
    $ pode test.js

If your binding provides a (new) method, pode will register your binding by
running this method, so make sure to return a blessed object, other wise pode
will bless your module by default so there is no need to write the (new) method unless
you have something to initiate there

Now after registering your module with pode, every time pode calls a method from
javascript you should expect three arguments

=over 4

=item * B<self> : a blessed reference to this package

=item * B<arguments> : array ref of arguments passed from javascript

=item * B<JavaScript::Shell> : a blessed JavaScript::Shell object

=back

Perl Binding Example :

    package Pode::Test;
    
    Pode::exports('someMethod');
    sub someMethod {
        my $self = shift; ## Pode::Test
        my $args = shift; ## array ref of arguments
        my $js = shift; ## JavaScript::Shell object
        
        my $name = $args->[0];
        my $age = $args->[1];
        
        ##you can use JavaScript::Shell object to excute
        ##javascript code on the fly
        $js->eval(qq!
            global.name = 'MMM';
        !);
        
        my $newage = $self->_makeMeSoOld($age);
        
        return {
            name => $name
            age => $newage
        };
    }
    
    sub _makeMeSoOld {
        my $self = shift;
        my $age = shift;
        
        ## you're getting extra years
        ##do you really expect to live this long??
        return $age + 100;
    }

Javascript Example :
    
    var test = process.binding('Test');
    
    var ret = test.someMethod('Mamod',32);
    
    console.log(ret.age); //132  now you're 100 years older :)
    console.log(ret.name);
    console.log(global.name); //MMM

=head1 LICENSE

This library is free software; you can redistribute it and/or modify
it under the same terms as Perl itself, either Perl version 5.16.2 or,
at your option, any later version of Perl 5 you may have available.

=head1 COPYRIGHTS

Copyright (C) 2013 by Mamod A. Mehyar <mamod.mehyar@gmail.com>

=cut
