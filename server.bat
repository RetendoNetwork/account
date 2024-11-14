git pull
bash generate-key.sh
docker build --no-cache -t account .
docker run account
pause