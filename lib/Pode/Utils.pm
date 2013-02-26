package Pode::Utils;
use strict;
use warnings;
use File::Spec;


#=============================================================================
# load module process, this doesn't load it just find the required module
# to be loaded and send back location path + file name
# TODO move this to javascript
#=============================================================================
sub resolveModule {
    my $args = shift;
    my $pode = shift;
    my $file = $args->{id};
    
    ##get file extention
    my ($ext) = $file =~ /(\.[^.]+)$/;
    
    my $baseDir;
    my $newFile;
    if ($file =~ m/^\.*\//){
        
    } else {
        $baseDir = $pode->path;
    }
    
    if ($ext){
        if ($ext eq '.js'){
            $newFile = $baseDir.'/Modules/'.$file;
            return File::Spec->canonpath($newFile);
        } elsif ($ext eq '.pm'){
            ##load core modules
        }
    } else {
        die "no extension provided with name";
    }
    
}


sub _sleep {
    my $ms = shift;
    #$ms = $ms / 1000;
    select(undef,undef,undef,$ms);
}




1;

__END__
