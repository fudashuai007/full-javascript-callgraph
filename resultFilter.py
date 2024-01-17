import json  
import re  
  
# 读取JSON文件  
with open('b.json', 'r') as file:  
    data = json.load(file)  
  
# 保存匹配的项到另一个文件  
with open('output.log', 'w') as file:  
    for item in data:
      if re.search(r'(static\/lib)|(static\/index)',  item.split("->")[0]):  
          file.write(item + '\n')