@echo off
setlocal

cd /d "%~dp0"

set "IMAGE=shadyelshrief/broker-karepo"
set "TAG=%~1"
if not defined TAG set "TAG=latest"

echo Building %IMAGE%:%TAG%...
docker build --tag "%IMAGE%:%TAG%" . || exit /b 1

echo Pushing %IMAGE%:%TAG%...
docker push "%IMAGE%:%TAG%" || exit /b 1

echo Done: %IMAGE%:%TAG%
