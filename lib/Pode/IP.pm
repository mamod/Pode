package Pode::IP;
use Pode::Wrapper;
use strict;
use warnings;
use Data::Dumper;
use IO::Handle;
use Symbol 'gensym';
use Socket;
use IPC::Run::Win32IO;
use IPC::Run qw(start);
use Errno;
#use posix qw($ERRNO);
my $ready = $^O eq 'MSWin32' ? \&Ready : \&Ready;


Wrap 'fork' => sub {
    
    my $self = shift;
    my $args = shift;
    my $ev = shift;
    
    my $prog = $args->[0];
    my @args = $args->[1] ? @{$args->[1]} : ();
    
    my @cmd = ($prog,@args);
    my @lines;
    
    socketpair(my $CHILD, my $PARENT, AF_UNIX, SOCK_STREAM, PF_UNSPEC)
    || die "socketpair: $!";


    #shutdown($CHILD,1);    # close write channel for $READER
    #shutdown($PARENT,0);    # and read channel for $WRITER
    
    open my $olderr, '>&', \*STDERR or die($!);
    open my $oldout, '>&', \*STDOUT or die($!);
    open my $oldin, '<&', \*STDIN or die($!);
    
    open STDIN,'<&', $PARENT;
    open STDOUT,'>&', $PARENT;
    
    $CHILD->blocking(0);
    $PARENT->blocking(0);
    $CHILD->autoflush(1);
    $PARENT->autoflush(1);
    
    shutdown($CHILD,1);
    close $PARENT;
    my $pid = system(1,@cmd);
    select(undef,undef,undef,1);
    
    STDIN->fdopen(fileno $oldin,'<');
    STDOUT->fdopen(fileno $oldout,'>');
    STDERR->fdopen(fileno $olderr,'>');
    
    $ev->set('send',sub {
        my $s = shift;
        my $message = shift->[0];
        my $written;
        if ($written = $CHILD->syswrite($message)){
            return $written;
        }
        
        return 0;
    });
    
    $ev->set('close',sub {
        $ev->destroy();
    });
    
    $ev->{pid} = $pid;
    
    my $err_pos = 0;
    my $counter = 0;
    
    $ev->loop(sub{
        
        ##NON BLOCKING
        my $read = sysread($CHILD,my $buf, 8 * 1024);
        
        $ev->data({
            data => $buf
        }) if $buf;
        
        ##ERROR READER
        #my $err = -s $ERR;
        #if ($err > $err_pos){
        #    seek $ERR,$err_pos,0;
        #    my $read = sysread($ERR,my $buf, 8 * 1024);
        #    seek $ERR,0,2;
        #    $ev->data({
        #        error => $buf
        #    });
        #    $err_pos += $read;
        #}
        
        if (waitpid($pid,-1)){
            $ev->end($? >> 8);
        }
    });
    
    return {
        pid => $pid,
        stdout => fileno $CHILD,
        stdin => fileno $CHILD
    };
};

Wrap 'forkdd' => sub {
    
    my $self = shift;
    my $args = shift;
    my $ev = shift;
    
    my $prog = $args->[0];
    my @args = $args->[1] ? @{$args->[1]} : ();
    
    my @cmd = ($prog,@args);
    my @lines;
    
    my ($OUT,$IN,$ERR);
    my $pid = $ev->exec($OUT,$IN,$ERR,@cmd);
    
    $ev->set('send',sub {
        my $s = shift;
        
        my $message = shift->[0];
        my $written;
        if ($written = $IN->syswrite($message)){
            return $written;
        } else {
            #print Dumper $!;
        }
        
        return 0;
    });
    
    $ev->set('close',sub {
        $ev->destroy();
    });
    
    $ev->{pid} = $pid;
    
    my $err_pos = 0;
    my $counter = 0;
    $ev->loop(sub{
        
        ##NON BLOCKING
        my $read = sysread($OUT,my $buf, 8 * 1024);
        
        $ev->data({
            data => $buf
        }) if $buf;
        
        ##ERROR READER
        my $err = -s $ERR;
        if ($err > $err_pos){
            seek $ERR,$err_pos,0;
            my $read = sysread($ERR,my $buf, 8 * 1024);
            seek $ERR,0,2;
            $ev->data({
                error => $buf
            });
            $err_pos += $read;
        }
        
        #if (waitpid($pid,-1)){
        #    $ev->end($? >> 8);
        #}
    });
    
    return {
        pid => $pid,
        stdout => fileno $OUT,
        stdin => fileno $IN
    };
};


sub Ready {
    my $fh = shift;
    my $fd = fileno $fh;
    my $rfd = '';
    vec ($rfd, $fd, 1) = 1;
    if (select ($rfd, undef, undef, 0) >= 0 && vec($rfd, $fd, 1)){
        return 1;
    }
    return 0;
}

Wrap 'forkxx' => sub {
    
    my $self = shift;
    my $args = shift;
    my $ev = shift;
    
    my $prog = $args->[0];
    my @args = $args->[1] ? @{$args->[1]} : ();
    
    my @cmd = ($prog,@args);
    my @lines;
    
    my $OUT = gensym;
    my $IN = gensym;
    my $ERROR = gensym;
    my $r = start \@cmd, '<pipe', $IN, '>pipe', $OUT, '2>pipe', $ERROR 
    or die "cat returned $?";
    
    my $pid = $r->{KIDS}->[0]->{PID};
    
    print Dumper $pid;
    $OUT->blocking(0);
    $IN->blocking(0);
    $ERROR->blocking(0);
    
    $ev->loop(sub{
        #syswrite($IN,'ddddddddd');
        sysread($OUT, my $buf,8 * 1024);
        if ($buf){
            $ev->data({
                data => $buf
            });
        }
        
        sysread($ERROR,my $error, 8 * 1024);
        if ($error){
            $ev->data({
                error => $error
            });
        }
        
        #if (waitpid($pid,-1)){
        #    $ev->end($? >> 8);
        #}
        
    });
    
    $ev->set('send',sub {
        my $s = shift;
        $s->pause;
        my $message = shift->[0];
        my $written = $IN->syswrite($message);
        #print Dumper $r;
        $s->resume;
        return $written || 0;
    });
    
    return 1;
};

sub emitter {
    my ($ev,$fh,$type) = @_;
    my $is_ready = $ready->($fh);
    my $read = 0;
    my $str = '';
    while ($is_ready = $ready->($fh)){
        $read = sysread($fh,my $buf,512);
        $str .= $buf;
    }
    
    $ev->data({
        $type => $str
    }) if $str;
    
    return $read;
}

sub emitter2 {
    my ($ev,$fh,$type) = @_;
    my $is_ready = $ready->($fh);
    my $read = 0;
    
    if ($is_ready){
        $read = sysread($fh,my $buf,512);
        $ev->data({
            $type => $buf
        }) if $buf;
    }
    
    return $read;
}

1;

__END__
