package Pode::Fs;
use strict;
use warnings;
use Data::Dumper;
use Fcntl ':mode';
use FileHandle;
use Pode::Wrapper;

Pode::exports('stat','fstat','lstat','open','close','read','write','unlink');
Pode::exports {
    constants => {
        'S_IFMT'        =>  S_IFMT,
        'S_IFDIR'       =>  S_IFDIR,
        'S_IFREG'       =>  S_IFREG,
        'S_IFBLK'       =>  S_IFBLK,
        'S_IFCHR'       =>  S_IFCHR,
        'S_IFLNK'       =>  eval { S_IFLNK } || 0,
        'S_IFIFO'       =>  S_IFIFO,
        'S_IFSOCK'      =>  eval { S_IFSOCK } || 0,
        
        ##file bindings
        'O_APPEND'      =>  O_APPEND,
        'O_CREAT'       =>  O_CREAT,
        'O_DIRECTORY'   =>  eval { O_DIRECTORY } || 0,
        'O_EXCL'        =>  O_EXCL,
        'O_NOCTTY'      =>  eval { O_NOCTTY } || 0,
        'O_NOFOLLOW'    =>  eval { O_NOFOLLOW } || 0,
        'O_RDONLY'      =>  O_RDONLY,
        'O_RDWR'        =>  O_RDWR,
        'O_SYMLINK' => eval "O_SYMLINK" || 0,
        'O_SYNC'        =>  eval { O_SYNC } || 0,
        'O_TRUNC'       =>  O_TRUNC,
        'O_WRONLY'      =>  O_WRONLY
    }
};

sub stat {
    my $self = shift;
    my $args = shift;
    my $path = $args->[0];
    $path =~ s/\\\\\?\\//g;
    my @stat = CORE::stat($path) or return Pode::throw($! . " " . $path);
    return \@stat;
}

sub fstat {
    my $self = shift;
    my $args = shift;
    my $fd = $args->[0];
    my $fh = $self->{FH}->{$fd};
    if (!ref $fh){
        $fh =~ s/\\\\\?\\//g;
    }
    my @stat = CORE::stat($fh) or return Pode::throw($!);
    return \@stat;
}

sub lstat {
    my $self = shift;
    my $args = shift;
    my $file = $args->[0];
    $file =~ s/\\\\\?\\//g;
    my @stat = lstat($file) or return Pode::throw($!);
    return \@stat;
}

my $dircount = 0;
sub open {
    my $self = shift;
    my $args = shift;
    my $js = shift;
    
    my $fh;
    my $path = $args->[0];
    my $mode = $args->[1];
    my $perm = $args->[2];
    if (-d $path){
        $dircount++;
        my $dir = "dir_$dircount";
        $self->{FH}->{$dir} = $path;
        return $dir;
    } else {
        sysopen ($fh, $path, $mode, $perm) or return Pode::throw($! . " " . $path);
    }
    
    $self->{FH}->{fileno $fh} = $fh;
    
    return fileno $fh;
}

sub close {
    my $self = shift;
    my $fd = shift->[0];
    my $fh = $self->{FH}->{$fd};
    CORE::close $fh;
    delete $self->{FH}->{$fd};
    return 1;
}

sub GET_OFFSET {
    defined $_[0] ? $_[0] : -1;
}

sub read {
    
    my $self = shift;
    my $args = shift;
    my $fd = $args->[0];
    my $buffer = $args->[1];
    my $off = $args->[2];
    
    my $object = Pode::Wrapper::Get($buffer);
    
    my $buffer_length = $object->{buffer}->length;
    
    if ($off >= $buffer_length) {
        return Pode::throw("Offset is out of bounds");
    }
    
    my $len = $args->[3];
    if ($off + $len > $buffer_length) {
        return  Pode::throw("Length extends beyond buffer");
    }
    
    my $pos = GET_OFFSET($args->[4]);
    my $fh = $self->{FH}->{$fd};
    seek $fh,0,$pos;
    
    my $r = sysread($fh, $object->{buffer}->{buf}, $len);
    return $r;
}

sub write {
    my $self = shift;
    my $args = shift;
    my $js = shift;
    my $fd = $args->[0];
    my $wrapper = $args->[1];
    my $offset = $args->[2];
    my $length = $args->[3];
    my $position = $length - $offset;
    my $ret = {};
    my $fh = $self->{FH}->{$fd};
    local $ret->{buf} = Pode::Wrapper::Get($wrapper)->{buffer};
    local $ret->{str} = $ret->{buf}->toString($offset,$length);
    my $written = syswrite($fh,$ret->{str});
    undef $ret;
    return $written;
}

sub unlink {
    my $self = shift;
    my $args = shift;
    my $file = $args->[0];
    $file =~ s/\\\\\?\\//g;
    unlink $file or return Pode::throw($!);
    return \1;
}

1

__END__

