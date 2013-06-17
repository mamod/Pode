use IO::Handle;

STDOUT->autoflush(1);

for (1..100){
    print 'A';
}

die "555";
