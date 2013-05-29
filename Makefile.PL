use 5.010001;
use ExtUtils::MakeMaker;


# See lib/ExtUtils/MakeMaker.pm for details of how to influence
# the contents of the Makefile that is written.
WriteMakefile(
    NAME              => 'Pode',
    VERSION_FROM      => 'lib/Pode.pm', # finds $VERSION
    EXE_FILES    => ['script/pode'],
    PREREQ_PM         => {
	'JavaScript::Shell' => 0
    },
    ($] >= 5.005 ?     ## Add these new keywords supported since 5.005
      (ABSTRACT_FROM  => 'lib/Pode.pm', # retrieve abstract from module
       AUTHOR         => 'Mamod A. Mehyar <mamod.mehyar@gmail.com>') : ())
);

