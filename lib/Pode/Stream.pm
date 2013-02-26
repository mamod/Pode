package Pode::Stream;
use strict;
use warnings;
use Pode::Module;
use Data::Dumper;
use Pode::IO::Select;
use IO::Handle;
my @FH;

use constant stdin => fileno(STDIN);
use constant stdout => fileno(STDOUT);


sub ini {
    return {
        exports => ['readableStream','writableStram','resume','pause','write','_read','can_read','can_write']
    }
}

sub new {
    my $options = shift;
    my $self = bless({
    select => Pode::IO::Select->new()
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
        
    }
    
    my $fh = IO::Handle->new();
    $fh->fdopen($fno,"r");
    $self->{Handles}->{$fno} = $fh;
    
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
    $self->{Handles}->{$fno} = $fh;
    return 1;
}


sub _read {
    my $self = shift;
    my $args = shift;
    
    my $fd = $args->{fd};
    my $bufSize = $args->{buffSize};
    my $fh = $self->{Handles}->{$fd};
    my $pos = tell($fh);
    seek($fh, $pos, 0);
    read($fh,my $data,$bufSize);
    #print Dumper tell($fh);
    #$fh->sysread(my $data,$bufSize);
    return $data;
}

my $count = 0;
sub write {
    my $self = shift;
    my $fd = shift;
    #my $fh = $self->{Handles}->{$fd};
    my $fh = IO::Handle->new();
    $fh->fdopen($fd,"w");
    
    $fh->print("HELLOOOOO $count\n");
    $count++;
    return 1;
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
        
        my $fh = $self->{Handles}->{$fd};
        next if !$fh;
        my $pos = tell($fh);
        my $c = (stat($fh))[7];
        
        if ($pos == -1){
            #error emitter
            #die;
        }
        
        if ($c < $pos) {
            seek $fh,0,2;
            #$pos = tell($fh);
            #$c = (stat($fh))[7];
        }
        
        if ( $c >  $pos ){
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


sub select { shift->{select} }


1;

__END__

