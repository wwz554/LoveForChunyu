# 模块返修管理系统

面向设备/网络模块返修登记的轻量 Web 系统。

## 功能

- Excel `.xlsx/.xls/.csv` 批量导入，自动按常见中文/英文列名映射。
- 上传快递单、模块型号、SN 等照片，OCR 自动提取文字并尝试整理字段。
- 文本框直接粘贴聊天记录/快递信息，自动解析成结构化返修记录。
- 缺失字段留空；新建记录没有返回时间时自动使用当天日期。
- 表格内直接修改、单条保存、删除、手动新增。
- SQLite 持久化，无需额外数据库。
- Docker / docker-compose 部署。

## 字段

规格/型号、设备SN、设备识别码、车间/站点、返回时间、发出时间、发出地、收件人、寄件人、备注。

## 启动

```bash
docker compose up -d --build
```

打开 `http://服务器IP:8000`。

本地 Python：

```bash
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

## OCR

默认使用 RapidOCR 本地推理，不把照片发送给第三方 OCR 服务。
