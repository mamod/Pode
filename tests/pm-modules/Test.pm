package Test2;

Pode::exports('test');

sub test {
    my $self = shift;
    my $args = shift;
    my $num = $args->[0];
    return $num+1;
}