#!perl

if ( $^O eq 'MSWin32' ) {
    require Win32;
    Win32::SetChildShowWindow( Win32::SW_HIDE() );
}

system(@ARGV);

