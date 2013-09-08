package Pode::Buffer;
use strict;
use warnings;
use Data::Dumper;
use utf8;
use Encode qw( encode_utf8 decode_utf8 from_to encode decode _utf8_on );
use Pode::Wrapper;
use MIME::Base64;

Pode::exports('write','deleteTemp','test','create');


sub Get {
    my $object = shift;
    
}

sub MIN {
    my $a = shift;
    my $b = shift;
    return $a < $b ? $a : $b
}

Wrap 'SlowBuffer' => sub {
    
    my $self = shift;
    my $args = shift;
    my $handle = shift;
    my $js = shift;
    
    my $buf = Pode::Buffer::Base->new();
    $buf->{offset} = 0;
    
    if (my $ilength = $args->[0]){
        $buf->{length} = $ilength;
    }
    
    $handle->{buffer} = $buf;
    my $ret = {};
    
    my $writeStr = sub {
        my $h = shift;
        my $args = shift;
        my $str = $args->[0];
        my $offset = $args->[1];
        my $len = $args->[2];
        my $encoding = $args->[3];
        my $ret = $buf->write($str,$offset,$len,$encoding);
        return $ret;
    };
    
    $handle->set('_writeBigBuffer' => sub {
        my $h = shift;
        my $args = shift;
        local $ret->{str} = $js->{buffer};
        my $offset = $args->[0];
        my $len = $args->[1];
        my $encoding = $args->[2];
        my $ret2 = $writeStr->($h,[$ret->{str},$offset,$len,$encoding]);
        undef $ret->{str};
        undef $js->{buffer};
        return $ret2;
    });
    
    $handle->set('offset' => sub {
        my $h = shift;
        my $args = shift;
        return $buf->{offset};
    });
    
    $handle->set('_write' => $writeStr);
    
    $handle->set('_toString' => sub {
        my $h = shift;
        my $args = shift;
        my $offset = $args->[0];
        my $len = $args->[1];
        my $encoding = $args->[2];
        local $ret->{str} = $buf->toString($offset,$len,$encoding);
        
        return $js->buffer($ret->{str});
        if ($buf->{length} > 64 * 1024){
            return $js->buffer($ret->{str},'none');
        } else {
            $ret->{str} = decode('utf8',$ret->{str});
            return encode('utf8',$ret->{str});
        }
    });
    
    $handle->set('_length' => sub {
        return $buf->{length};
    });
    
    $handle->set('get' => sub {
        my $h = shift;
        my $args = shift;
        my $index = $args->[0];
        return $buf->get($index);
    });
    
    $handle->set('set' => sub {
        my $h = shift;
        my $args = shift;
        my $index = $args->[0];
        my $value = $args->[1];
        $value = encode('ISO-8859-1',$value);
        substr $buf->{buf},$index,1, $value;
        return 1;
    });
    
    $handle->set('_bytelength' => sub {
        return length $buf->{buf};
    });
    
    $handle->set('copy2' => sub {
        my $h = shift;
        my $args = shift;
        my $tagretBuf = $args->[0];
        my $targetStart = $args->[1];
        my $sourceStart = $args->[2];
        my $sourceEnd = $args->[3];
        my $offset = $sourceEnd - $sourceStart;
        my $object = Pode::Wrapper::Get($tagretBuf);
        my $replace = $buf->toString($sourceStart,$offset);
        #print Dumper $args;
        
        #eval {
            substr $object->{buffer}->{buf},$targetStart,$offset,$replace;
        #};
        
        undef $replace;
        return 1;
    });
    
    $handle->set('copy' => sub {
        my $h = shift;
        my $args = shift;
        
        my $source = $buf;
        my $target = Pode::Wrapper::Get($args->[0])->{buffer};
        my $target_data = $target->{buf};
        my $target_length = $target->{length};
        my $target_start = defined $args->[1] ? $args->[1] : 0;
        my $source_start = defined $args->[2] ? $args->[2] : 0;
        my $source_end = defined $args->[3] ? $args->[3] : 0;
        
        if ($source_end < $source_start){
            return Pode::throw('sourceEnd < sourceStart');
        }
        
        #// Copy 0 bytes; we're done
        #if (source_end == source_start) {
        #  return scope.Close(Integer::New(0));
        #}
        
        if ($source_end == $source_start){
            die;
            return 0;
        }
        
        if ($target_start >= $target_length){
            return Pode::throw('targetStart out of bounds');
        }
        
        if ($source_start >= $source->{length}){
            return Pode::throw('sourceStart out of bounds');
        }
        
        if ($source_end > $source->{length}){
            return Pode::throw('sourceEnd out of bounds');
        }
        
        my $to_copy = MIN(MIN($source_end - $source_start,
        $target_length - $target_start),
        $source->{length} - $source_start);
        
        my $str = unpack("x$source_start a$to_copy", $source->{buf});
        substr $target->{buf},$target_start, $to_copy, $str;
        
        #$target->{length} = length $target->{buf};
        
        undef $str;
        return $to_copy;
    });
    
    $handle->set('inspect' => sub {
        my $h = shift;
        my $args = shift;
        my $off = $args->[0] || 0;
        my $len = $args->[1] || 50;
        my @r;
        my $str = substr $buf->{buf},0,50;
        for my $c (split //, $str) {
            push @r, sprintf "%02x", ord $c;
        }
        
        my $ret = join ' ',@r;
        return "<Buffer $ret>";
    });
    
    $handle->set('fill' => sub {
        my $h = shift;
        my $args = shift;
        my $int = $args->[0];
        my $start = $args->[1];
        my $end = $args->[2];
        my $str = chr ($int) x ($end - $start);
        substr $buf->{buf},$start,$end-$start,$str;
        undef $str;
        return 1;
    });
    
    $handle->set('toArray' => sub {
        my ($h) = @_;
        my @b = unpack("W*", $buf->{buf});
        return \@b;
    });
    
    $handle->set('setArray' => sub {
        my ($h,$args) = @_;
        #print STDERR Dumper $args;
        my $arr = $args->[0];
        if (ref $arr eq 'ARRAY'){
            $buf->{buf} = pack('W*', @$arr);
            #for (@$arr){
            #    $buf->{buf} .= chr $_;
            #}
        }
        return 1;
    });
    
    $handle->set('sort' => sub {
        my ($h) = @_;
        my @b = unpack("W*", $buf->{buf});
        my @sorted = sort {$a <=> $b} @b;
        $buf->{buf} = pack( 'W*', @sorted );
        return 1;
    });
    
    $handle->set('destroy' => sub {
        undef $buf->{buf};
        undef $buf;
        if (defined $handle){
            $handle->destroy();
            undef $handle;
        }
    });
    
    $handle->end();
    return 1;
};

package Pode::Buffer::Base;
use strict;
use warnings;
use Encode qw( encode_utf8 decode_utf8 from_to encode decode );
use MIME::Base64;
use Data::Dumper;

my $ret = {};
sub new {
    my $class = shift;
    my $self = bless ({
        encoding => 'utf8',
        buf => '',
        offset => 0
    },$class);
    return  $self;
}

sub length {
    shift->{length};
}

sub slow_ascii {
    local $ret->{str} = $_[0];
    local $ret->{str2} = '';
    map {
        $ret->{str2} .= chr($_ & 0x7f);
    } unpack('W*',$ret->{str});
    
    return $ret->{str2};
}


sub write {
    my $self = shift;
    my $str = shift;
    my $offset = shift;
    my $len = shift;
    my $encoding = shift || 'utf8';
    
    if ($encoding eq 'hex'){
        $str = pack('H*',$str);
    } elsif ($encoding eq 'base64'){
        $str = decode_base64($str);
    } elsif ($encoding eq 'ascii'){
        ###encoding done in javascript
    } elsif ($encoding eq 'utf8'){
        use bytes;
        $str = unpack('a*', $str);
        no bytes;
    } elsif ($encoding eq 'binary'){
        $str = encode('ISO-8859-1',$str);
    } elsif ($encoding eq 'ucs2'){
        $str = encode("UCS-2LE", $str);
    }
    
    if (defined $len){
        $str = unpack("a$len", $str);
    }
    
    my $str_length = CORE::length $str;
    if (defined $len && $len > $str_length){
        $len = $str_length;
    }
    
    substr $self->{buf},$offset,$len || $str_length,$str;
    
    if (!$self->{length}){
        $self->{length} = $str_length;
    }
    
    undef $str;
    return $str_length;
}

sub toString {
    my $self = shift;
    my $offset = shift;
    my $len = shift;
    my $encoding = shift || 'none';
    local $ret->{str} = $self->{buf};
    $ret->{str} = unpack("x$offset a$len", $self->{buf});
    
    if ($encoding eq 'hex'){
        $ret->{str} = unpack('H*',$ret->{str});
    } elsif ($encoding eq 'base64'){
        $ret->{str} = encode_base64($ret->{str},'');
    } elsif ($encoding eq 'ascii'){
        my $string = '';
        my $off1 = 0;
        my $len1 = 8 * 1024;
        my $strlen = bytes::length $ret->{str};
        while ($off1 < $strlen){
            map {
                $string .= chr($_ & 0x7f);
            } unpack("x$off1 W$len1",$ret->{str});
            
            $off1 += $len1;
        }
        
        $ret->{str} = $string;
        undef $string;
        
    } elsif ($encoding eq 'binary'){
        #$ret->{str} = decode('ISO-8859-1',$ret->{str});
    } elsif ($encoding eq 'utf8'){
        Pode::Buffer::Encode::decode_utf8($ret->{str});
    } elsif ($encoding eq 'ucs2'){
        $ret->{str} = decode("UCS-2LE", $ret->{str});
    }
    
    return $ret->{str};
}


sub get {
    my ($self,$index) = @_;
    my $b = unpack("x$index a1", $self->{buf});
    $b =  ord $b;
    return $b;
}

package Pode::Buffer::Encode;
use Encode qw[find_encoding is_utf8];
my $utf8enc;
sub decode_utf8($;$) {
    my ( $octets, $check ) = @_;
    return $octets if is_utf8($octets);
    return undef unless defined $octets;
    $octets .= '' if ref $octets;
    $check   ||= 0;
    $utf8enc ||= find_encoding('utf8');
    ##change encoding in place
    $_[0] = $utf8enc->decode( $octets, $check );
    #$_[0] = $octets if $check and !ref $check and !( $check & LEAVE_SRC() );
    undef $octets;
    return 1;
}


1;
