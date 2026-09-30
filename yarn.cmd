@SETLOCAL
@SET PATHEXT=%PATHEXT:;.JS;=;%
node "%~dp0\.yarn\releases\yarn-4.10.3.cjs" %*
