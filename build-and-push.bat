@echo off
setlocal

cd /d "%~dp0"

set "IMAGE=shadyelshrief/broker-karepo"
set "TAG=%~1"
if not defined TAG set "TAG=latest"
set "EXIT_CODE=0"

echo Building %IMAGE%:%TAG%...
docker build --tag "%IMAGE%:%TAG%" .
if errorlevel 1 (
    set "EXIT_CODE=1"
    echo.
    echo ERROR: Docker image build failed.
    goto :finish
)

echo Pushing %IMAGE%:%TAG%...
docker push "%IMAGE%:%TAG%"
if errorlevel 1 (
    set "EXIT_CODE=1"
    echo.
    echo ERROR: Docker image push failed.
    goto :finish
)

echo Done: %IMAGE%:%TAG%

:finish
echo.
pause
exit /b %EXIT_CODE%
