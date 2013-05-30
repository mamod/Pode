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
    $js->destroy();
    my $error = shift->[0];
    die $error->{message} . ' at ' . $error->{file} . ' line ' . $error->{line};
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
        $LOAD->{module} = caller(0);
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


1

__END__

=head1 NAME

Pode - javascript server side for the perl community

=head1 DESCRIPTION

bla bla

