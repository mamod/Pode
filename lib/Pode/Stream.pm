package Pode::Stream;
use Pode::Wrapper;
use strict;
use warnings;
use IO::Handle;
use Data::Dumper;
use Encode;
my $Handles = {};

Pode::exports('readableStream','writableStream','writeString','writeBuffer','wr');

sub new {
    bless({
        io => IO::Handle->new()
    },__PACKAGE__);
}

sub wr {
    my $self = shift;
    my $args = shift->[0];
    my $str = $args->{string};
    my $buffer = $args->{buffer};
    my $fd = $args->{fd};
    my $fh = $Handles->{Writable}->{$fd};
    my $written = syswrite($fh,$str,$buffer) or return Pode::throw($!);
    return $written;
}

Wrap 'writeString' => sub {
    my $self = shift;
    my $args = shift->[0];
    my $ev = shift;
    
    my $str = $args->{string};
    my $buffer = $args->{buffer};
    my $fd = $args->{fd};
    my $fh = $Handles->{Writable}->{$fd};
    my $length = length($str);
    
    my $count = 0;
    my $offset = 0;
    $ev->loop(sub {
        my $written = syswrite($fh,$str,$buffer,$offset) or return $ev->error($!);
        $offset += $written;
        if ($offset >= $length){
            $ev->end;
        }
    });
    
    return 1;
};


sub readableStream {
    my $self = shift;
    my $fd = shift->[0];
    my $fh = $self->io->fdopen($fd,'r') or return Pode::throw($!);
    ##all input is utf
    binmode $fh, ":utf8";
    $Handles->{Readable}->{$fd} = $fh;
    return 1;
}

sub writableStream {
    my $self = shift;
    my $fd = shift->[0];
    #my $fh = $self->io->new_from_fd($fd,'w') or return Pode::throw($! . " " . $fd);
    my $fh;
    if ($fd == fileno STDOUT){
        $fh = \*STDOUT;
    } elsif ($fd == fileno STDERR){
        $fh = \*STDERR;
    } else {
        $fh = $self->io->fdopen($fd,'w') or return Pode::throw($! . " " . $fd);
    }
    
    ##all output is utf
    binmode $fh, ":utf8";
    $Handles->{Writable}->{$fd} = $fh;
    return 1;
}

sub io {
    shift->{io}
}


1;

__END__
