
import os
import mysql.connector
from dotenv import load_dotenv
load_dotenv()

mysqlserverhost = os.environ['MYSQLSERVERHOST']
mysqlserverpwd = os.environ['MYSQLSERVERPWD']
mysqlserverdb = os.environ['MYSQLSERVERDB']
mysqlserveruser = os.environ['MYSQLSERVERUSER']

mydb = mysql.connector.connect(
    host=mysqlserverhost,
    user=mysqlserveruser,
    password=mysqlserverpwd,
    database=mysqlserverdb
)


mycursor = mydb.cursor()

mycursor.execute("SELECT * FROM Asterisk_inboundcdr")

myresult = mycursor.fetchall()

print (type(myresult))


