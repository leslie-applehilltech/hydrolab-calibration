using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Runtime.InteropServices;

namespace HydrolabApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class HydrolabUploadController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public HydrolabUploadController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] JsonElement json)
        {
            try
            {
                // Select proper timezone ID depending on platform
                string tzId = RuntimeInformation.IsOSPlatform(OSPlatform.Windows)
                    ? "Eastern Standard Time"           // Windows
                    : "America/New_York";              // Linux/macOS

                TimeZoneInfo easternZone = TimeZoneInfo.FindSystemTimeZoneById(tzId);

                DateTime utcNow = DateTime.UtcNow;
                DateTime easternTime = TimeZoneInfo.ConvertTimeFromUtc(utcNow, easternZone);

                string fileName = $"calibration_{easternTime:yyyyMMdd_HHmmss}.json";

                var saveDir = Path.Combine(_env.ContentRootPath, "Uploads");
                if (!Directory.Exists(saveDir))
                    Directory.CreateDirectory(saveDir);

                var fullPath = Path.Combine(saveDir, fileName);
                await System.IO.File.WriteAllTextAsync(fullPath, json.ToString());

                return Ok(new
                {
                    success = true,
                    savedAs = fileName,
                    utcTime = utcNow.ToString("yyyy-MM-dd HH:mm:ss"),
                    easternTime = easternTime.ToString("yyyy-MM-dd HH:mm:ss"),
                    timeZone = easternZone.StandardName
                });
            }
            catch (TimeZoneNotFoundException tzEx)
            {
                return StatusCode(500, new { error = $"Timezone not found: {tzEx.Message}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, error = ex.Message });
            }
        }
    }
}
