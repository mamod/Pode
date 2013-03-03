package Pode::IO;
use strict;
use warnings;
use Pode::Module;
use Data::Dumper;
use IO::Handle;
use IO::File;
use Fcntl ':mode';

use constant stdin => fileno(STDIN);
use constant stdout => fileno(STDOUT);


sub ini {
    return {
        exports =>['open','close','stat'],
        constants => {
            'S_IFMT' => S_IFMT,
            'S_IFDIR' => S_IFDIR,
            'S_IFREG' => S_IFREG,
            'S_IFBLK' => S_IFBLK,
            'S_IFCHR' => S_IFCHR,
            'S_IFLNK' => eval { S_IFLNK },
            'S_IFIFO' => S_IFIFO,
            'S_IFSOCK' => eval { S_IFSOCK },
            #'' => ,
        }
    }
}

sub new {
    my $options = shift;
    my $self = bless({
        io => IO::Handle->new()
    },__PACKAGE__);    
    return $self;
}

sub open {
    my $self = shift;
    my $args = shift;
    my $fh;
    $fh = IO::File->new($args->{path},$args->{flag}) or return pode()->throw($!);
    $self->{Readable}->{fileno $fh} = $fh;
    return fileno $fh;
}


sub close {
    
    my $self = shift;
    my $args = shift;
    
}


sub stat {
    my $self = shift;
    my $path = shift;
    $path =~ s/\\\\\?\\//g;
    my @stat = stat($path);
    print Dumper S_ISUID;
    return \@stat;
}

1;


__END__
