# Before `make install' is performed this script should be runnable with
# `make test'. After `make install' it should work as `perl URI-Simple.t'

#########################
# change 'tests => 1' to 'tests => last_test_to_print';
use Test::More tests => 1;
use Pode;
use FindBin qw($Bin);

my $pode = Pode->new();
$pode->run([ $Bin . '/../tests/fs/all.js' ]);

is(1,1);
