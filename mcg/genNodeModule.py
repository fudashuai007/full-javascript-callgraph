import os
import subprocess

# 指定包含子文件夹的父文件夹路径
parent_folder = r'experiment/result'
# commander = 'pnpm i'
# commander = 'npm run test:coverage'
# 遍历父文件夹下的所有子文件夹
for folder_name in os.listdir( parent_folder):
    # 构建子文件夹的完整路径
    print(os.path)
    folder_path = os.path.join(parent_folder, folder_name)
    

    # 检查当前路径是否为文件夹
    if os.path.isdir(folder_path):
        # 构建package.json文件的路径
        package_json_path = os.path.join(folder_path, 'package.json')

        # 检查该子文件夹是否包含package.json文件
        if os.path.exists(package_json_path):
            print(f"Installing npm packages in {folder_path}...")
            
            # 使用subprocess执行npm i命令
            try:
                subprocess.check_call(['pnpm','i'],cwd=folder_path,shell=True)
            except subprocess.CalledProcessError as e:
                print(f"Error installing npm packages in {folder_path}: {e}")
        else:
            print(f"No package.json found in {folder_path}")

