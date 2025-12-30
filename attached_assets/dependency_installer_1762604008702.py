#!/usr/bin/env python3
"""
Automatic Dependency Installer for Sora Video Generator
This script will install all required dependencies automatically.
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n{'='*60}")
    print(f"{description}")
    print(f"{'='*60}")
    try:
        subprocess.check_call(command, shell=True)
        print(f"✓ {description} - SUCCESS")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ {description} - FAILED")
        print(f"Error: {e}")
        return False

def check_python_version():
    """Ensure Python version is compatible"""
    version = sys.version_info
    print(f"Python version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 7):
        print("✗ Python 3.7 or higher is required!")
        return False
    
    print("✓ Python version is compatible")
    return True

def install_pip_packages():
    """Install required pip packages"""
    packages = [
        "requests",
        "openai"
    ]
    
    print("\nInstalling Python packages...")
    for package in packages:
        cmd = f"{sys.executable} -m pip install {package}"
        if not run_command(cmd, f"Installing {package}"):
            return False
    
    return True

def create_env_file():
    """Create a .env template file"""
    env_content = """# OpenAI API Key Configuration
# Get your API key from: https://platform.openai.com/api-keys

OPENAI_API_KEY=your_api_key_here
"""
    
    if not os.path.exists(".env"):
        with open(".env", "w") as f:
            f.write(env_content)
        print("\n✓ Created .env template file")
        print("  → Please edit .env and add your API key")
    else:
        print("\n✓ .env file already exists")

def create_requirements_file():
    """Create requirements.txt file"""
    requirements = """requests>=2.31.0
openai>=1.0.0
"""
    
    with open("requirements.txt", "w") as f:
        f.write(requirements)
    
    print("\n✓ Created requirements.txt file")

def main():
    print("""
╔══════════════════════════════════════════════════════════╗
║        SORA VIDEO GENERATOR - DEPENDENCY INSTALLER       ║
╚══════════════════════════════════════════════════════════╝
""")
    
    if not check_python_version():
        sys.exit(1)
    
    print("\nUpgrading pip...")
    run_command(f"{sys.executable} -m pip install --upgrade pip", "Upgrading pip")
    
    if not install_pip_packages():
        print("\n✗ Failed to install some packages")
        print("You can try installing manually with:")
        print(f"  {sys.executable} -m pip install requests openai")
        sys.exit(1)
    
    create_requirements_file()
    create_env_file()
    
    print(f"""
{'='*60}
✓ INSTALLATION COMPLETE!
{'='*60}

Next steps:

1. Get your OpenAI API key:
   → Go to: https://platform.openai.com/api-keys
   → Create a new API key
   
2. Configure your API key (choose one method):
   
   Method A - Environment Variable (recommended):
   → Edit the .env file and add your key
   → Or set it in your terminal:
     $env:OPENAI_API_KEY='your-api-key-here'
   
   Method B - Direct input:
   → The script will prompt you for the key when you run it

3. Run the video generator:
   → python sora_video_gen.py

{'='*60}
""")

if __name__ == "__main__":
    main()