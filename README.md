# Ordering Portal

## First steps

### 1. Installation of Dependencies

To install all dependencies please run the following command:

```bash
yarn --immutable && yarn prepare
```

### 2. Setting up configuration file

Create a file with the name `proxy.conf.json` inside of the root folder (the same folder where this README.md that you are currently reading is located). Then use the following example as its file content:

```json
[
  {
    "context": ["/rest/"],
    "target": "http://localhost:4200/rest/",
    "secure": false,
    "logLevel": "debug",
    "pathRewrite": { "^/rest": "" }
  }
]
```

Change the `localhost:4200` to your system e.g. `ws-abc.local.hacon.de:8081` to ensure that all requests that will be done to your backend. Of course instead of your local workstation you could use what ever server you might want to use e.g. `https://test-environment.local.hacon.de`.

### 3. Start the Web-Frontend

In order to start the Web-Frontend you have multiple options. First is to run the application in `development` mode with the following command:

```bash
yarn start:dev
```

Or if you prefer to run the application in `production` mode you could execute the following instead:

```bash
yarn start:prod
```

After any of these commands you should be able to open the application in your browser with the following URL: http://localhost:4200

## Git Hooks

This project uses `pre-push` git hook via [husky](https://github.com/typicode/husky):

### pre-push

This will execute the following checks/scripts:

- translation
- update-cmake
- Linting
- Unit Tests

## Working with devcontainers

This repository can be developed on by using [VS Code's development containers](https://code.visualstudio.com/docs/remote/containers).

**You need to have:**

- Linux (other OS should work, but have not been tested)
- VS Code
- Docker

Set environment variables `DEVCON_UID` and `DEVCON_GID` to the uid and gid of the repository files owner.
Since this usually is the login user, you can add this to your `.bashrc`:

```
export DEVCON_UID=$(id -u)
export DEVCON_GID=$(id -g)
```

Check that your environment is populated with these variables:

```
echo $DEVCON_UID
echo $DEVCON_GID
```

1. Clone this repository.
2. Open the cloned repository folder in VS Code.
3. Open it inside a development container (VS Code will most probably suggest that in the bottom-right corner when opening the folder) or install a plugin called `Dev Containers` (ID: ms-vscode-remote.remote-containers) and use `[CTRL]+[SHIFT]+[P]` and use command `Dev Containers: Open Folder in Container...`

### Troubleshooting for Devcontainers

#### Microsoft Windows

If you want to work remotely from a windows system and connect to e.g. a Ubuntu workstation.

##### ssh ENOENT error

It might happen that on starting the container it can not connect to your workstation using ssh. An error message is displayed saying something like:

```
Command 'Dev Containers: Open Filder in Container...' resulted in an error (Shell server failed: Error: spawn C:\Program Files (x86)\ Microsoft VS Code\ssh ENOENT at Process-ChildProcess._handle.onexit (...
```

If that is the case try the following setting in VSCode:

> **Remote.SSH: Path**
>
> An absolute path to the SSH executable. When empty, it will use "ssh" on the path or in common install locations.
>
> `C:\Program Files\Git\usr\bin\ssh.exe`

##### Git Credentials not working

In case your git credentials are declined do the following steps on your local system (not the remote machine):

1. Create RSA key on your local system
   - use `ssh-keygen`
   - or make use of the `git GUI` to create a new SSH key
2. These keys are usually stored in:
   - `C:\Users\<USERNAME>\.ssh\`
3. Add public key ( content of e.g. id_rsa.pub) to your GitLab account ( GitLab -> Edit Profile -> SSH Keys)
4. Add the key to SSH Agent:
   - `ssh-add  ~/.ssh/id_rsa`
5. Copy the key over to your remote system:
   - `type C:\Users\<USERNAME>\.ssh\id_rsa.pub | ssh <USER>@ws-<USER>.local.hacon.de "cat >> .ssh/authorized_keys"`

If things are still not working start a **local Administrator PowerShell** and run the following commands:

```PowerShell
# Make sure you're running as an Administrator
Set-Service ssh-agent -StartupType Automatic
Start-Service ssh-agent
Get-Service ssh-agen
```
