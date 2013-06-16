
my $args = \@ARGV;

print $args->[0];

sleep 2;
my $i = 0;
for (1..10000){
    $i++;
    print $i . "\n";
}

print STDERR "This is An Error";

exit(129);
