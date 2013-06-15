package Pode::Fs;
use strict;
use warnings;
use Data::Dumper;
use Fcntl ':mode';
use FileHandle;

Pode::exports('stat','fstat','lstat','open','close','_read');
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
    my @stat = CORE::stat($fh) or return Pode::throw($!);
    return \@stat;
}

sub lstat {
    my $self = shift;
    my $args = shift;
    my $file = $args->[0];
    my @stat = lstat($file);
    return \@stat;
}

sub open {
    my $self = shift;
    my $args = shift;
    my $js = shift;
    my $fh;
    my $path = $args->[0];
    my $flag = $args->[1];
    my $mode = $args->[2];
    $fh = IO::File->new($path,$flag) or return Pode::throw($! . " " . $path);
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

sub _read {
    my $self = shift;
    my $args = shift;
    my $buff;
    my $fd = $args->[0];
    my $len = $args->[1];
    my $pos = $args->[2];
    my $fh = $self->{FH}->{$fd};
    my $r = sysread($fh,$buff,$len,$pos);# or return pode()->throw($!);
    return [$buff,$r];
}



1

__END__
