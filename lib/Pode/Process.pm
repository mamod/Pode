package Pode::Process;
use Pode::Module;

exports 'test' => 'test';
exports 'test2' => 'test2';
register __PACKAGE__ => 'Process';

sub ini {
    return {
        exports => ['all']
    }
}

sub new {
    my $self = bless({},__PACKAGE__);
    return $self;
}


sub all {
    
    return {
        pid => $$,
        env => \%ENV,
        os => $^O
    }
    
}


1;

__END__
