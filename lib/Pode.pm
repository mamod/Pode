package Pode;
use strict;
use warnings;
use JavaScript::Shell;
use Data::Dumper;
use File::Spec;
use Cwd;
use FindBin qw($Bin);
our $VERSION = '0.01';

##global object for loaded modules
my $MODELS = {};

sub new {
    my $class = shift;
    ( my $path = $INC{'Pode.pm'} ) =~ s/\.pm$//;
    my $self = {
        js => JavaScript::Shell->new(),
        path => $path
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
    $js->Set('process.execPath' => File::Spec->canonpath ( $Bin . '/plackup'));
    $js->Set('process.moduleLoadList' => []);
    $js->Set('process._binding' => \&binding);
    $js->Set('process.pid2' => sub {return $$} );
    $js->Set('process.cwd' => sub { return cwd() } );
    $js->Set('process.sleep' => \&_sleep);
    $js->Set('process.platform' => $platform);
    $js->Set('process._tickInfoBox' => [0,0,0]);
    $js->Set('process._needTickCallback' => \&NeedTickCallback);
    $js->Set('process._nativedir' => $nativeDir . $sep);
    $js->Set('process.die' => \&error);
    
    $js->onError(sub{
        my $s = shift;
        my $err = shift;
        print Dumper $err;
        $js->destroy();
    });
    
    $js->call('load' => $nativeDir .'/pode.js');
    eval {
        $js->run();
    };
    
    if ($@){
        print STDERR "$@\n";
        $js->call('process.die' => $@);
    }
    return $self;
}


sub NeedTickCallback {}
#==============================================================================
# error handler
#==============================================================================
sub error {
    my $js = shift;
    $js->call('quit',1);
    my $error = shift->[0];
    print STDERR $error->{message} . ' at '
    . $error->{file} . ' line ' . $error->{line} . "\n";
    exit(1);
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
<<<<<<< HEAD
        $LOAD->{module} = caller(0);
=======
        $LOAD->{module} = $module;
>>>>>>> readme
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
<<<<<<< HEAD
        
=======
        $module =~ s/\W+//g;
>>>>>>> readme
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
    
    my $exports;
    $exports = $LOAD;
    
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

<<<<<<< HEAD

=======
>>>>>>> readme
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

<<<<<<< HEAD

=======
>>>>>>> readme
1

__END__

=head1 NAME

Pode - javascript server side for the perl community

=head1 DESCRIPTION

<<<<<<< HEAD
bla bla

=======
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
>>>>>>> readme
