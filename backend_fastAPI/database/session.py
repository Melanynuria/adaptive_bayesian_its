from fastapi import FastAPI                             #API
from fastapi.staticfiles import StaticFiles             #serves static files
from fastapi.responses import FileResponse              
from starlette.middleware.cors import CORSMiddleware    #allows frontend and backend communication through browser
from pydantic import BaseModel
from typing import Any, Dict, List
from pathlib import Path
import uuid      
from datetime import datetime, timezone
import json
from pathlib import Path