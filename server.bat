git pull
bash generate-keys.sh
docker build --no-cache -t account .
docker run account
pause