import os
import subprocess
import json
# 指定包含子文件夹的父文件夹路径
parent_folder = 'experiment/result'

def run_command( command, timeout=None):
	try:
		process = subprocess.run( command.split(), stdout=subprocess.PIPE, stdin=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
	except subprocess.TimeoutExpired:
		error_string = "TIMEOUT ERROR: for user-specified timeout " + str(timeout) + " seconds"
		error = "TIMEOUT ERROR"
		return( error.encode('utf-8'), error_string.encode('utf-8'), 1) # non-zero return code
	return( process.stderr, process.stdout, process.returncode)

def get_dependencies( pkg_json, manager):
	if pkg_json["devDependencies"]:
  	# subprocess.check_call()
		run_command( "rm -r node_modules")
		run_command( "mv package.json TEMP_package.json_TEMP")
		dev_deps = pkg_json["devDependencies"]
		pkg_json["devDependencies"] = {}
		with open("package.json", 'w') as f:
			json.dump( pkg_json, f)
		run_command( manager + (" install" if manager == "npm run " else ""))
		pkg_json["devDependencies"] = dev_deps
	# get the list of deps, excluding hidden directories
	deps = [d for d in os.listdir("node_modules") if not d[0] == "."] 
	# then, reset the deps (if required)
	if pkg_json["devDependencies"]:
		run_command( "rm -r node_modules")
		run_command( "mv TEMP_package.json_TEMP package.json")
		run_command( manager + (" install" if manager == "npm run " else ""))
	return( deps)

# 遍历父文件夹下的所有子文件夹
for folder_name in os.listdir( parent_folder):
  # 构建子文件夹的完整路径
  # print(os.path)
  # folder_path = os.path.join(parent_folder, folder_name)
	package_json_path = os.path.join(os.path.join(parent_folder, folder_name), 'package.json')
	with open(package_json_path) as f:
		pkg_json = json.load(f)
	output_file = open(os.path.join(parent_folder, folder_name) + "/dep_list.txt", 'w')
	os.chdir( os.path.join(parent_folder, folder_name))
	dep_output = get_dependencies(pkg_json, 'npm i',folder_name)
