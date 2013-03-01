package Pode::Stream;
use strict;
use warnings;
use Pode::Module;
use Data::Dumper;
use IO::Handle;
my @FH;

use constant stdin => fileno(STDIN);
use constant stdout => fileno(STDOUT);


sub ini {
    return {
        exports => ['readableStream','writableStream','resume','pause','write','_read','can_read','can_write','check_state']
    }
}

sub new {
    my $options = shift;
    my $self = bless({
        io => IO::Handle->new()
    },__PACKAGE__);    
    return $self;
}


sub readableStream {
    my $self = shift;
    my $args = shift;
    my $fno = $args->{fd};
    
    #there is no filehandle associated,
    #open a new anonymous file with read permission
    if (!$fno){
        return 1;
    }
    
    my $fh = IO::Handle->new();
    $fh->fdopen($fno,"r");
    $self->{Handles}->{Readable}->{$fno} = $fh;
    return 1;
}


sub writableStream {
    my $self = shift;
    my $args = shift;
    my $fno = $args->{fd};
    
    #there is no filehandle associated,
    #open a new anonymous file with write permission
    if (!$fno){
        
    }
    
    my $fh = IO::Handle->new();
    $fh->fdopen($fno,"w");
    $fh->autoflush(1);
    $self->{Handles}->{Writable}->{$fno} = $fh;
    return 1;
}


sub _read2 {
    my $self = shift;
    my $args = shift;
    my $fd = $args->{fd};
    my $bufSize = $args->{buffSize};
    my $fh = $self->{Handles}->{Readable}->{$fd};
    my $pos = tell($fh);
    seek($fh, $pos, 0);
    read($fh,my $data,$bufSize);
    return $data;
}


sub _read {
    my $self = shift;
    my $args = shift;
    my $fd = $args->{fd};
    my $bufSize = $args->{buffSize};
    my $fh = pode()->Model('IO')->{Readable}->{$fd} || $self->{Handles}->{Readable}->{$fd};
    my $pos = tell($fh);
    seek($fh, 0, 1);
    sysread($fh,my $data,$bufSize);
    return $data;
}




sub write {
    my $self = shift;
    my $args = shift;
    my $fd = $args->{fd};
    my $data = $args->{data};
    my $fh = $self->{Handles}->{Writable}->{$fd};
    $fh->print("$data") or return $!;
    return $data;
}

my $time = time();
sub can_read {
    my $self = shift;
    my $args = shift;
    my $ret = [];
    
    #print Dumper $self;
    foreach my $fd (@{$args}){
        #print Dumper stdin;
        
        
        
        if ($fd == stdin){
            
                push @$ret,{
                fd => $fd,
                call => 'emitReadable',
                type => 'Read'
                };
            
            next;
        }
        
        my $fh = $self->{Handles}->{Readable}->{$fd};
        next if !$fh;
        my $pos = tell($fh);
        my $c = (stat($fh))[7];
        
        if ($pos == -1){
            #error emitter
            die $!;
        }
        
        if ($c < $pos) {
            ##reset position at end of file
            seek $fh,0,2;
        }
        
        if ( $c >  $pos){
            push @$ret,{
                fd => $fd,
                call => 'emitReadable',
                type => 'Read'
            };
        }
    }
    
    
    #print Dumper $ret;
    return $ret;
}

sub check_state {
    my $self = shift;
    my $fd = shift;
    my $fh = $self->{io};
    $fh->fdopen($fd,"r");
    
    my $pos = tell($fh);
    my $state = (stat($fh))[7];
    
    return {
        pos => $pos,
        state => $state
    };
}


sub DESTROY {
    print Dumper 'HII';
}


1;

__END__

